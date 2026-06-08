import {
  refreshContentCardsEditor,
  setContentCardsAssetPaths,
  setContentCardsChangeHandler,
  setContentCardsUploadHandler,
  setContentCardsWorkflow,
  setupContentCardsEditor
} from "./mvp-cards-editor.js";
import {
  createContentSource,
  getStoredContentLabel,
  getStoredTemplateId,
  hasStoredContent,
  setStoredContentLabel,
  setStoredTemplateId
} from "./mvp-content-source.js";
import { renderMvpNav } from "./mvp-nav.js";

const DEMO_TEMPLATE_ID = "pipeline-demo";
const DEFAULT_TEMPLATE_ID = DEMO_TEMPLATE_ID;

const state = {
  templates: [],
  animationPresets: ["clean-rise", "slide-fly", "soft-float"],
  dirty: false
};

const renderState = {
  runId: null,
  outputView: "images",
  links: null,
  workflow: null,
  quickRender: false
};

function isQuickRenderEnabled() {
  return $("quick-render")?.checked === true;
}

function buildQuickRenderContent(rawContent) {
  const parsed = JSON.parse(rawContent);
  if (!Array.isArray(parsed.cards) || parsed.cards.length === 0) {
    throw new Error("Content must include at least one card for quick render");
  }
  return formatJson({ ...parsed, cards: [parsed.cards[0]] });
}

function isQuickRenderMappingSlot(slot) {
  return /^card1\./i.test(slot) || /^cover(\.|$)/i.test(slot);
}

function buildQuickRenderMapping(mappingValue) {
  const parsed =
    typeof mappingValue === "string" ? JSON.parse(mappingValue) : { ...mappingValue };
  const slots = Object.fromEntries(
    Object.entries(parsed.slots || {}).filter(([slot]) => isQuickRenderMappingSlot(slot))
  );
  if (!Object.keys(slots).length) {
    throw new Error("Quick render mapping has no card 1 slots");
  }
  return formatJson({ ...parsed, slots });
}

function buildRenderPayload(template, { quickRender }) {
  const templateWorkflow = template.workflow || {};
  const body = {
    templateId: template.id,
    mapping: formatJson(template.mappingExample),
    content: contentSource.getValue(),
    animationPreset: $("animation-preset").value,
    workflow: templateWorkflow
  };

  if (!quickRender) return body;

  return {
    ...body,
    pngOnly: true,
    mapping: buildQuickRenderMapping(template.mappingExample),
    content: buildQuickRenderContent(body.content),
    workflow: {
      ...templateWorkflow,
      cardCount: 1,
      splitVideos: false
    }
  };
}

const contentSource = createContentSource();

const $ = (id) => document.getElementById(id);

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function setStatus(message, tone = "neutral", details = []) {
  const box = $("status-box");
  box.dataset.tone = tone;
  box.textContent = [message, ...details.filter(Boolean)].join("\n");
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = Array.isArray(payload.details) ? payload.details : [];
    const error = new Error(payload.error || "Request failed");
    error.details = details;
    throw error;
  }
  return payload;
}

async function requestFormJson(url, form) {
  const response = await fetch(url, { method: "POST", body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Upload failed");
  }
  return payload;
}

function selectedTemplate() {
  const templateId = $("template-select").value;
  return state.templates.find((template) => template.id === templateId) || null;
}

function isPipelineDemoTemplate(template) {
  return template?.id === DEMO_TEMPLATE_ID;
}

function syncDemoStudioMode(template) {
  const isDemo = isPipelineDemoTemplate(template);
  document.body.classList.toggle("mvp-demo-studio", isDemo);

  const banner = $("demo-banner");
  if (banner) banner.hidden = !isDemo;

  const presetField = $("animation-preset-field");
  if (presetField) presetField.hidden = isDemo;

  const saveBtn = $("save-content");
  if (saveBtn) saveBtn.hidden = isDemo;

  const fileLabel = $("content-file-label");
  if (fileLabel) fileLabel.hidden = isDemo;

  const details = $("studio-editor-details");
  if (details) details.open = !isDemo;
}

function setDirty(dirty) {
  state.dirty = dirty;
  $("save-content").disabled = !dirty;
  $("content-file-label").textContent = dirty
    ? "Unsaved changes."
    : "Using saved template content.";
}

function applyContent(content, label = null) {
  contentSource.setValue(formatJson(content));
  setStoredContentLabel(label);
  refreshContentCardsEditor(contentSource, formatJson);
}

function useStoredContentForTemplate(template) {
  return Boolean(template?.id && hasStoredContent() && getStoredTemplateId() === template.id);
}

function syncTemplateContext(template, payload = {}) {
  if (!template) return;
  const workflow = payload.workflow || template.workflow || {};
  const assetPaths = payload.assetPaths || template.assetPaths || [];
  setContentCardsWorkflow(workflow);
  setContentCardsAssetPaths(assetPaths, template.id);
  setStoredTemplateId(template.id);
  applyDemoTemplateDefaults(template);
}

function applyDemoTemplateDefaults(template) {
  const isDemo = template?.id === DEMO_TEMPLATE_ID;
  const demoBadge = $("template-demo-badge");
  if (demoBadge) demoBadge.hidden = !isDemo;

  const quickRenderEl = $("quick-render");
  if (isDemo && quickRenderEl) {
    quickRenderEl.checked = true;
  }
}

function demoTemplateStatusMessage() {
  return "Demo template — Quick render recommended";
}

async function loadTemplateContent(template) {
  if (!template) return;

  setStatus("Loading template content...", "loading");
  const payload = await requestJson(`/api/templates/${encodeURIComponent(template.id)}/content`);

  template.contentExample = payload.content;
  template.mappingExample = payload.mappingExample || template.mappingExample || {};
  template.workflow = payload.workflow || template.workflow || {};
  template.assetPaths = payload.assetPaths || template.assetPaths || [];

  const shouldUseStoredContent = useStoredContentForTemplate(template);
  const storedLabel = getStoredContentLabel();
  syncTemplateContext(template, payload);
  if (shouldUseStoredContent) {
    refreshContentCardsEditor(contentSource, formatJson);
    $("content-file-label").textContent = storedLabel
      ? `Imported file: ${storedLabel}`
      : "Using browser session content.";
    setDirty(Boolean(storedLabel));
  } else {
    applyContent(payload.content, null);
    setDirty(false);
  }
  syncDemoStudioMode(template);
  setStatus(
    template.id === DEMO_TEMPLATE_ID ? demoTemplateStatusMessage() : "Ready",
    "success"
  );
}

function renderTemplateOptions(preferredTemplateId = "") {
  $("template-select").innerHTML = state.templates
    .map(
      (template) =>
        `<option value="${template.id}">${template.name || template.id}</option>`
    )
    .join("");

  if (preferredTemplateId && state.templates.some((item) => item.id === preferredTemplateId)) {
    $("template-select").value = preferredTemplateId;
  }
}

function renderPresetOptions() {
  $("animation-preset").innerHTML = state.animationPresets
    .map((preset) => `<option value="${preset}">${preset}</option>`)
    .join("");
}

function setDownloadButtonsEnabled(enabled) {
  $("btn-download-png").disabled = !enabled;
  $("btn-download-mp4").disabled = !enabled;
  $("btn-download-all").disabled = !enabled;
}

function setToolbarEnabled(enabled) {
  $("btn-show-images").disabled = !enabled;
  $("btn-show-video").disabled = !enabled;
  setDownloadButtonsEnabled(enabled);
}

function filenameFromContentDisposition(header) {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header);
  return match ? decodeURIComponent(match[1].replace(/"/g, "")) : null;
}

async function triggerZipDownload(kind) {
  if (!renderState.runId) return;

  const zipName = kind === "images" ? "images.zip" : kind === "video" ? "video.zip" : "all.zip";
  const url = `/api/render/download/${renderState.runId}/${zipName}`;

  try {
    setDownloadButtonsEnabled(false);
    const response = await fetch(url);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `Download failed (${response.status})`);
    }

    const blob = await response.blob();
    const filename =
      filenameFromContentDisposition(response.headers.get("Content-Disposition")) || zipName;
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setDownloadButtonsEnabled(Boolean(renderState.runId));
  }
}

function previewGridEl() {
  return document.querySelector("#output-panel .mvp-preview-grid");
}

function ensureMp4CardGrid() {
  let grid = $("mp4-card-grid");
  if (grid) return grid;

  grid = document.createElement("div");
  grid.id = "mp4-card-grid";
  grid.className = "mvp-mp4-grid";
  grid.hidden = true;
  previewGridEl()?.after(grid);
  return grid;
}

function clearPngSplitCards() {
  previewGridEl()
    ?.querySelectorAll(".mvp-split-png-card")
    .forEach((card) => card.remove());
}

function populateOutputMedia(links, workflow) {
  const cacheBust = `?t=${Date.now()}`;

  if (links.png) {
    $("png-preview").src = `${links.png}${cacheBust}`;
  } else {
    $("png-preview").removeAttribute("src");
  }

  if (links.mp4) {
    $("mp4-preview").src = `${links.mp4}${cacheBust}`;
  } else {
    $("mp4-preview").removeAttribute("src");
  }

  clearPngSplitCards();
  const pngs = Array.isArray(links.pngs) ? links.pngs : [];
  if (pngs.length > 1) {
    const grid = previewGridEl();
    pngs.forEach((link, index) => {
      const figure = document.createElement("figure");
      figure.className = "mvp-mp4-card mvp-split-png-card";
      figure.innerHTML = `<figcaption>card ${String(index + 1).padStart(2, "0")}</figcaption><img alt="PNG card ${index + 1}" src="${link}${cacheBust}" />`;
      grid?.append(figure);
    });
  }

  const splitVideos =
    workflow.splitVideos === true && Array.isArray(links.mp4s) && links.mp4s.length > 1;
  const mp4Grid = ensureMp4CardGrid();
  if (splitVideos) {
    mp4Grid.innerHTML = links.mp4s
      .map(
        (link, index) =>
          `<figure class="mvp-mp4-card"><figcaption>card ${String(index + 1).padStart(2, "0")}</figcaption><video controls src="${link}${cacheBust}"></video></figure>`
      )
      .join("");
  } else {
    mp4Grid.innerHTML = "";
    mp4Grid.hidden = true;
  }
}

function setOutputView(view) {
  renderState.outputView = view;

  const showImages = view === "images";
  $("btn-show-images").classList.toggle("is-active", showImages);
  $("btn-show-video").classList.toggle("is-active", !showImages);

  $("btn-download-png").classList.toggle("mvp-hidden", !showImages);
  $("btn-download-mp4").classList.toggle("mvp-hidden", showImages);

  const links = renderState.links || {};
  const workflow = renderState.workflow || {};
  const splitVideos =
    workflow.splitVideos === true && Array.isArray(links.mp4s) && links.mp4s.length > 1;
  const hasPngSplits = Array.isArray(links.pngs) && links.pngs.length > 1;

  $("png-preview").hidden = !showImages || !links.png;
  previewGridEl()
    ?.querySelectorAll(".mvp-split-png-card")
    .forEach((card) => {
      card.hidden = !showImages || !hasPngSplits;
    });

  $("mp4-preview").hidden = showImages || !links.mp4;

  const mp4Grid = $("mp4-card-grid");
  if (mp4Grid) {
    mp4Grid.hidden = showImages || !splitVideos;
  }
}

function showOutput(payload, { quickRender = false } = {}) {
  const links = payload.links || {};
  const workflow = payload.workflow || {};

  renderState.runId = payload.runId || null;
  renderState.links = links;
  renderState.workflow = workflow;
  renderState.quickRender = quickRender;

  $("output-panel").hidden = false;
  $("quick-render-note").hidden = !quickRender;
  $("props-preview").textContent = formatJson(payload.props || {});

  populateOutputMedia(links, workflow);
  setOutputView(quickRender ? "images" : renderState.outputView);
  setToolbarEnabled(Boolean(renderState.runId));

  if (quickRender) {
    $("btn-show-video").disabled = true;
    $("btn-download-mp4").disabled = true;
  }
}

async function loadTemplates(preferredTemplateId = "") {
  setStatus("Loading templates...", "loading");
  const payload = await requestJson("/api/templates");
  state.templates = payload.templates || [];
  state.animationPresets = payload.animationPresets || state.animationPresets;
  renderTemplateOptions(preferredTemplateId);
  renderPresetOptions();

  if (!state.templates.length) {
    setStatus("No templates found", "error");
    $("run-render").disabled = true;
    $("save-content").disabled = true;
    return;
  }

  await loadTemplateContent(selectedTemplate());
}

async function uploadCardImage(file) {
  const template = selectedTemplate();
  if (!template || !file) return null;

  const form = new FormData();
  form.append("files", file);

  setStatus("Uploading image...", "loading");
  const payload = await requestFormJson(
    `/api/templates/${encodeURIComponent(template.id)}/assets/images`,
    form
  );
  const uploaded = payload.uploaded?.[0];
  const paths = payload.assets?.paths || [];
  template.assetPaths = paths;
  setContentCardsAssetPaths(paths, template.id);
  setDirty(true);
  setStatus("Image uploaded", "success");

  return {
    path: uploaded?.path || "",
    assetPaths: paths
  };
}

async function saveContent() {
  const template = selectedTemplate();
  if (!template) return;

  $("save-content").disabled = true;
  setStatus("Saving content...", "loading");

  try {
    const parsed = JSON.parse(contentSource.getValue());
    const payload = await requestJson(`/api/templates/${encodeURIComponent(template.id)}/content`, {
      method: "PATCH",
      body: JSON.stringify({ content: parsed })
    });

    template.contentExample = payload.content;
    applyContent(payload.content, null);
    setDirty(false);
    setStatus("Saved", "success");
  } catch (error) {
    setDirty(true);
    setStatus(error.message, "error", error.details || []);
  }
}

async function runRender() {
  const template = selectedTemplate();
  if (!template) {
    setStatus("Select a template first", "error");
    return;
  }

  const quickRender = isQuickRenderEnabled();

  $("run-render").disabled = true;
  $("output-panel").hidden = true;
  $("quick-render-note").hidden = true;
  renderState.runId = null;
  renderState.links = null;
  renderState.workflow = null;
  renderState.quickRender = false;
  renderState.outputView = "images";
  setToolbarEnabled(false);
  setStatus(
    quickRender ? "Quick render: 1 card PNG..." : "Rendering PNG and MP4...",
    "loading"
  );

  try {
    const requestBody = buildRenderPayload(template, { quickRender });
    const payload = await requestJson("/api/render", {
      method: "POST",
      body: JSON.stringify(requestBody)
    });
    showOutput(payload, { quickRender });
    const modeLabel = quickRender ? "Quick render complete" : "Render complete";
    setStatus(`${modeLabel}: ${payload.runId}`, "success");
  } catch (error) {
    setStatus(error.message, "error", error.details || []);
  } finally {
    $("run-render").disabled = false;
  }
}

function wireEvents() {
  $("template-select").addEventListener("change", () => {
    loadTemplateContent(selectedTemplate()).catch((error) =>
      setStatus(error.message, "error", error.details || [])
    );
  });
  $("save-content").addEventListener("click", saveContent);
  $("run-render").addEventListener("click", runRender);
  $("btn-show-images").addEventListener("click", () => setOutputView("images"));
  $("btn-show-video").addEventListener("click", () => setOutputView("video"));
  $("btn-download-png").addEventListener("click", () => triggerZipDownload("images"));
  $("btn-download-mp4").addEventListener("click", () => triggerZipDownload("video"));
  $("btn-download-all").addEventListener("click", () => triggerZipDownload("all"));
}

renderMvpNav("render");
wireEvents();
setupContentCardsEditor(contentSource, formatJson);
setContentCardsChangeHandler(() => setDirty(true));
setContentCardsUploadHandler(uploadCardImage);
setToolbarEnabled(false);
const preferredTemplateId =
  new URLSearchParams(window.location.search).get("template") ||
  getStoredTemplateId() ||
  DEFAULT_TEMPLATE_ID;

loadTemplates(preferredTemplateId).catch((error) => {
  setStatus(error.message, "error", error.details || []);
});
