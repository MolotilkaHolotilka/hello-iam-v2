import {
  refreshContentCardsEditor,
  setContentCardsAssetPaths,
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

const state = {
  templates: []
};

const contentSource = createContentSource();

const $ = (id) => document.getElementById(id);

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function setStatus(message, tone = "neutral") {
  const box = $("status-box");
  box.dataset.tone = tone;
  box.textContent = message;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

function selectedTemplate() {
  const templateId = $("template-select").value;
  return state.templates.find((template) => template.id === templateId) || null;
}

function syncTemplateContext(template) {
  if (!template) return;
  setContentCardsWorkflow(template.workflow || {});
  setContentCardsAssetPaths(template.assetPaths || [], template.id);
  setStoredTemplateId(template.id);
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
  refreshContentCardsEditor(contentSource, formatJson);
}

function fillTemplateExamples(template) {
  if (!template) return;
  applyContent(formatJson(template.contentExample), null);
  $("content-file").value = "";
  syncTemplateContext(template);
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
  const template = selectedTemplate();
  syncTemplateContext(template);
  if (hasStoredContent()) {
    updateContentFileLabel(getStoredContentLabel());
    refreshContentCardsEditor(contentSource, formatJson);
  } else if (template) {
    fillTemplateExamples(template);
  }
}

async function loadTemplates() {
  setStatus("Loading templates...", "loading");
  const payload = await requestJson("/api/templates");
  state.templates = payload.templates || [];
  const preferredTemplateId = getStoredTemplateId() || "";
  renderTemplateOptions(preferredTemplateId);

  if (!state.templates.length) {
    setStatus("No templates found", "error");
    return;
  }

  setStatus("Ready", "success");
}

async function readContentFile(fileInput) {
  const file = fileInput.files?.[0];
  if (!file) return;
  applyContent(await file.text(), file.name);
}

function wireEvents() {
  $("template-select").addEventListener("change", () => {
    fillTemplateExamples(selectedTemplate());
    setStatus("Ready", "success");
  });
  $("content-file").addEventListener("change", (event) => readContentFile(event.target));
}

renderMvpNav("dev");
wireEvents();
setupContentCardsEditor(contentSource, formatJson);
loadTemplates().catch((error) => {
  setStatus(error.message, "error");
});
