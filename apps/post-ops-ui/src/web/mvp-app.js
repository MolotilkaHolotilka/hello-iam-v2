import {
  createContentSource,
  getStoredContentLabel,
  getStoredTemplateId,
  hasStoredContent,
  setStoredContentLabel,
  setStoredTemplateId
} from "./mvp-content-source.js";
import { renderMvpNav } from "./mvp-nav.js";

const state = {
  templates: [],
  animationPresets: ["clean-rise", "slide-fly", "soft-float"],
  openTemplateCardId: ""
};

const renderState = {
  runId: null,
  outputView: "images",
  links: null,
  workflow: null
};

const contentSource = createContentSource();

const $ = (id) => document.getElementById(id);

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function humanizeTemplateId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw
    .replace(/^i-am-/, "")
    .replace(/^am-/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractAssetPaths(value, bucket = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => extractAssetPaths(item, bucket));
    return bucket;
  }

  if (!value || typeof value !== "object") {
    if (
      typeof value === "string" &&
      /^templates\/.+\.(png|jpe?g|webp|gif|svg)$/i.test(value.trim())
    ) {
      bucket.add(value.trim());
    }
    return bucket;
  }

  Object.values(value).forEach((item) => extractAssetPaths(item, bucket));
  return bucket;
}

function renderJsonWithLinks(value) {
  const json = formatJson(value);
  const assetRegex = /"((?:templates|content|assets)\/[^"]+\.(?:png|jpe?g|webp|gif|svg))"/gi;
  let html = "";
  let lastIndex = 0;

  for (const match of json.matchAll(assetRegex)) {
    const [fullMatch, assetPath] = match;
    html += escapeHtml(json.slice(lastIndex, match.index));
    html += `"<a href="/assets/${encodeURI(assetPath)}" target="_blank" rel="noreferrer">${escapeHtml(assetPath)}</a>"`;
    lastIndex = match.index + fullMatch.length;
  }

  html += escapeHtml(json.slice(lastIndex));
  return `<pre class="mvp-template-card-json">${html}</pre>`;
}

function readTemplateSummary(template) {
  const content = template?.contentExample || {};
  const cards = Array.isArray(content.cards) ? content.cards : [];
  const title =
    humanizeTemplateId(content.item) ||
    humanizeTemplateId(template?.name) ||
    template?.id ||
    "Template";
  const quotes = cards
    .map((card) => (typeof card?.quote === "string" ? card.quote.trim() : ""))
    .filter(Boolean);
  const teaser =
    quotes[0] ||
    (typeof template?.readme === "string"
      ? template.readme
          .split("\n")
          .map((line) => line.trim())
          .find((line) => line && !line.startsWith("# "))
      : "") ||
    "Template content preview";
  const chips = [];
  const firstCard = cards[0] || {};
  if (firstCard.titleAccent) chips.push(firstCard.titleAccent);
  if (firstCard.label) chips.push(firstCard.label);
  chips.push(`${cards.length || 0} cards`);
  const assetCount = extractAssetPaths(content).size;
  if (assetCount) chips.push(`${assetCount} images`);

  return {
    title,
    teaser,
    chips
  };
}

function setOpenTemplateCard(templateId) {
  state.openTemplateCardId = templateId || "";
}

function renderTemplateCards() {
  const grid = $("template-cards-grid");
  if (!grid) return;

  if (!state.templates.length) {
    grid.innerHTML = `<p class="mvp-template-cards-empty">No templates found.</p>`;
    return;
  }

  grid.innerHTML = state.templates
    .map((template) => {
      const summary = readTemplateSummary(template);
      const isOpen = template.id === state.openTemplateCardId;
      return `
        <article class="mvp-template-card${isOpen ? " is-open" : ""}" data-template-card="${template.id}">
          <button type="button" class="mvp-template-card-toggle" data-template-card-toggle="${template.id}" aria-expanded="${isOpen ? "true" : "false"}">
            <div class="mvp-template-card-headline">
              <div>
                <p class="mvp-template-card-kicker">${escapeHtml(template.name || template.id)}</p>
                <h3>${escapeHtml(summary.title)}</h3>
              </div>
              <span class="mvp-template-card-state">${isOpen ? "Hide JSON" : "Show JSON"}</span>
            </div>
            <p class="mvp-template-card-teaser">${escapeHtml(summary.teaser)}</p>
            <div class="mvp-template-card-chips">
              ${summary.chips.map((chip) => `<span class="mvp-template-card-chip">${escapeHtml(chip)}</span>`).join("")}
            </div>
          </button>
          <div class="mvp-template-card-body"${isOpen ? "" : " hidden"}>
            ${renderJsonWithLinks(template.contentExample)}
          </div>
        </article>
      `;
    })
    .join("");
}

function setStatus(message, tone = "neutral", details = []) {
  const box = $("status-box");
  box.dataset.tone = tone;
  box.textContent = [message, ...details.filter(Boolean)].join("\n");
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
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

function selectedTemplate() {
  const templateId = $("template-select").value;
  return state.templates.find((template) => template.id === templateId) || null;
}

function updateContentFileLabel(fileName) {
  const label = $("content-file-label");
  label.textContent = fileName
    ? `Selected file: ${fileName}`
    : "Using template default content.";
}

function applyContent(value, fileName = null) {
  contentSource.setValue(value);
  setStoredContentLabel(fileName);
  updateContentFileLabel(fileName);
}

function fillTemplateExamples(template) {
  if (!template) return;
  applyContent(formatJson(template.contentExample), null);
  $("content-file").value = "";
  setStoredTemplateId(template.id);
}

function renderTemplateOptions(preferredTemplateId = "") {
  $("template-select").innerHTML = state.templates
    .map(
      (template) =>
        `<option value="${template.id}">${template.name || template.id}</option>`
    )
    .join("");
  if (preferredTemplateId) {
    $("template-select").value = preferredTemplateId;
  }
  if (hasStoredContent()) {
    updateContentFileLabel(getStoredContentLabel());
  } else {
    fillTemplateExamples(selectedTemplate());
  }
  setOpenTemplateCard(preferredTemplateId || selectedTemplate()?.id || "");
  renderTemplateCards();
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

function showOutput(payload) {
  const links = payload.links || {};
  const workflow = payload.workflow || {};

  renderState.runId = payload.runId || null;
  renderState.links = links;
  renderState.workflow = workflow;

  $("output-panel").hidden = false;
  $("props-preview").textContent = formatJson(payload.props || {});

  populateOutputMedia(links, workflow);
  setOutputView(renderState.outputView);
  setToolbarEnabled(Boolean(renderState.runId));
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
    return;
  }

  setStatus("Ready", "success");
}

async function readContentFile(fileInput) {
  const file = fileInput.files?.[0];
  if (!file) return;
  applyContent(await file.text(), file.name);
}

async function runRender() {
  const template = selectedTemplate();
  if (!template) {
    setStatus("Select a template first", "error");
    return;
  }

  $("run-render").disabled = true;
  $("output-panel").hidden = true;
  renderState.runId = null;
  renderState.links = null;
  renderState.workflow = null;
  renderState.outputView = "images";
  setToolbarEnabled(false);
  setStatus("Rendering PNG and MP4...", "loading");

  try {
    const payload = await requestJson("/api/render", {
      method: "POST",
      body: JSON.stringify({
        templateId: template.id,
        mapping: formatJson(template.mappingExample),
        content: contentSource.getValue(),
        animationPreset: $("animation-preset").value,
        workflow: template.workflow || {}
      })
    });
    showOutput(payload);
    setStatus(`Render complete: ${payload.runId}`, "success");
  } catch (error) {
    setStatus(error.message, "error", error.details || []);
  } finally {
    $("run-render").disabled = false;
  }
}

function wireEvents() {
  $("template-select").addEventListener("change", () => {
    fillTemplateExamples(selectedTemplate());
    setOpenTemplateCard($("template-select").value);
    renderTemplateCards();
    setStatus("Ready", "success");
  });
  $("content-file").addEventListener("change", (event) => readContentFile(event.target));
  $("template-cards-grid").addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-template-card-toggle]");
    if (!toggle) return;

    const templateId = toggle.dataset.templateCardToggle;
    const template = state.templates.find((item) => item.id === templateId);
    if (!template) return;

    if ($("template-select").value !== templateId) {
      $("template-select").value = templateId;
      fillTemplateExamples(template);
    }

    setOpenTemplateCard(state.openTemplateCardId === templateId ? "" : templateId);
    renderTemplateCards();
    setStatus("Ready", "success");
  });
  $("run-render").addEventListener("click", runRender);
  $("btn-show-images").addEventListener("click", () => setOutputView("images"));
  $("btn-show-video").addEventListener("click", () => setOutputView("video"));
  $("btn-download-png").addEventListener("click", () => triggerZipDownload("images"));
  $("btn-download-mp4").addEventListener("click", () => triggerZipDownload("video"));
  $("btn-download-all").addEventListener("click", () => triggerZipDownload("all"));
}

renderMvpNav("render");
wireEvents();
setToolbarEnabled(false);
loadTemplates(getStoredTemplateId() || "").catch((error) => {
  setStatus(error.message, "error", error.details || []);
});
