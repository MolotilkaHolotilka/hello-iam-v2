import {
  refreshContentCardsEditor,
  setContentCardsAssetPaths,
  setContentCardsWorkflow,
  setupContentCardsEditor
} from "./mvp-cards-editor.js";
import { renderMvpNav } from "./mvp-nav.js";

const state = {
  templates: [],
  animationPresets: ["clean-rise", "slide-fly", "soft-float"]
};

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

function applyTemplateWorkflow(template) {
  if (!template) return;
  setContentCardsWorkflow(template.workflow || {});
}

function syncTemplateContext(template) {
  if (!template) return;
  applyTemplateWorkflow(template);
  setContentCardsAssetPaths(template.assetPaths || [], template.id);
}

function fillTemplateExamples(template) {
  if (!template) return;
  $("mapping-json").value = formatJson(template.mappingExample);
  $("content-json").value = formatJson(template.contentExample);
  syncTemplateContext(template);
  refreshContentCardsEditor($("content-json"), formatJson);
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
  fillTemplateExamples(selectedTemplate());
}

function renderPresetOptions() {
  $("animation-preset").innerHTML = state.animationPresets
    .map((preset) => `<option value="${preset}">${preset}</option>`)
    .join("");
}

async function readFileInto(fileInput, textarea) {
  const file = fileInput.files?.[0];
  if (!file) return;
  textarea.value = await file.text();
  if (textarea.id === "content-json") {
    refreshContentCardsEditor(textarea, formatJson);
  }
}

function showOutput(payload) {
  const links = payload.links || {};
  const workflow = payload.workflow || {};
  const splitVideos = workflow.splitVideos === true && Array.isArray(links.mp4s) && links.mp4s.length > 1;

  $("output-panel").hidden = false;
  $("png-link").href = links.png || "#";
  $("mp4-link").href = links.mp4 || "#";
  $("props-link").href = links.props || "#";
  $("png-card-links").innerHTML = Array.isArray(links.pngs)
    ? links.pngs
        .map(
          (link, index) =>
            `<a href="${link}" target="_blank" rel="noreferrer">card-${String(index + 1).padStart(2, "0")}.png</a>`
        )
        .join("")
    : "";

  const mp4ListEl = $("mp4-card-links");
  const mp4GridEl = $("mp4-card-grid");
  if (splitVideos) {
    mp4ListEl.innerHTML = `<strong>${links.mp4s.length} videos generated</strong>` +
      links.mp4s
        .map(
          (link, index) =>
            `<a href="${link}" target="_blank" rel="noreferrer">video-card-${String(index + 1).padStart(2, "0")}.mp4</a>`
        )
        .join("");
    mp4GridEl.innerHTML = links.mp4s
      .map(
        (link, index) =>
          `<figure class="mvp-mp4-card"><figcaption>card ${String(index + 1).padStart(2, "0")}</figcaption><video controls src="${link}?t=${Date.now()}"></video></figure>`
      )
      .join("");
    mp4GridEl.hidden = false;
  } else {
    mp4ListEl.innerHTML = "";
    mp4GridEl.innerHTML = "";
    mp4GridEl.hidden = true;
  }

  if (links.png) {
    $("png-preview").hidden = false;
    $("png-preview").src = `${links.png}?t=${Date.now()}`;
  }

  if (links.mp4) {
    $("mp4-preview").hidden = false;
    $("mp4-preview").src = `${links.mp4}?t=${Date.now()}`;
  }

  $("props-preview").textContent = formatJson(payload.props || {});
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

async function addJsxWorkflow() {
  const jsx = $("jsx-source").value.trim();
  if (!jsx) {
    setStatus("Paste JSX first", "error");
    return;
  }

  $("add-jsx-workflow").disabled = true;
  setStatus("Creating JSX workflow...", "loading");

  try {
    const cardCount = Number($("workflow-card-count").value || 0);
    const payload = await requestJson("/api/templates/from-jsx", {
      method: "POST",
      body: JSON.stringify({
        templateId: $("jsx-template-id").value,
        templateName: $("jsx-template-name").value,
        exportName: $("jsx-export-name").value,
        jsx,
        workflow: cardCount > 0 ? { cardCount } : {},
        mapping: $("mapping-json").value,
        content: $("content-json").value
      })
    });

    await loadTemplates(payload.template?.id || "");
    setStatus(`Workflow imported: ${payload.template?.id}`, "success");
  } catch (error) {
    setStatus(error.message, "error", error.details || []);
  } finally {
    $("add-jsx-workflow").disabled = false;
  }
}

async function runRender() {
  const template = selectedTemplate();
  if (!template) {
    setStatus("Select a template first", "error");
    return;
  }

  $("run-render").disabled = true;
  $("output-panel").hidden = true;
  setStatus("Rendering PNG and MP4...", "loading");

  try {
    const payload = await requestJson("/api/render", {
      method: "POST",
      body: JSON.stringify({
        templateId: template.id,
        mapping: $("mapping-json").value,
        content: $("content-json").value,
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
    const template = selectedTemplate();
    fillTemplateExamples(template);
    setStatus("Ready", "success");
  });
  $("mapping-file").addEventListener("change", (event) =>
    readFileInto(event.target, $("mapping-json"))
  );
  $("content-file").addEventListener("change", (event) =>
    readFileInto(event.target, $("content-json"))
  );
  $("jsx-file").addEventListener("change", (event) =>
    readFileInto(event.target, $("jsx-source"))
  );
  $("run-render").addEventListener("click", runRender);
  $("add-jsx-workflow").addEventListener("click", addJsxWorkflow);
}

renderMvpNav("render");
wireEvents();
setupContentCardsEditor($("content-json"), formatJson);
loadTemplates().catch((error) => {
  setStatus(error.message, "error", error.details || []);
});
