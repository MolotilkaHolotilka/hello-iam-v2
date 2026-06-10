import { createContentSource, setStoredContentLabel, setStoredTemplateId } from "./mvp-content-source.js";
import { renderMvpNav } from "./mvp-nav.js";

const state = {
  templates: []
};

const contentSource = createContentSource();
const $ = (id) => document.getElementById(id);

function setStatus(message, tone = "neutral", details = []) {
  const box = $("import-status");
  box.dataset.tone = tone;
  box.textContent = [message, ...details.filter(Boolean)].join("\n");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
    error.status = response.status;
    throw error;
  }
  return payload;
}

function selectedTemplateId() {
  return $("import-template-select").value;
}

function setStudioLink(templateId = selectedTemplateId()) {
  $("open-studio-link").href = templateId ? `/?template=${encodeURIComponent(templateId)}` : "/";
}

function setContentForStudio(templateId, content, label = null) {
  contentSource.setValue(JSON.stringify(content, null, 2));
  setStoredTemplateId(templateId);
  setStoredContentLabel(label);
  setStudioLink(templateId);
}

function validateContent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Content JSON must be an object.");
  }
  if (!Array.isArray(value.cards)) {
    throw new Error('Content JSON must include a "cards" array.');
  }
}

async function loadSelectedContentIntoSession() {
  const templateId = selectedTemplateId();
  if (!templateId) throw new Error("Select a template first.");

  const payload = await requestJson(`/api/templates/${encodeURIComponent(templateId)}/content`);
  setContentForStudio(templateId, payload.content, null);
  return payload.content;
}

function parseSessionContent() {
  const raw = contentSource.getValue();
  if (!raw.trim()) {
    throw new Error("Import a JSON file or load template content first.");
  }
  const content = JSON.parse(raw);
  validateContent(content);
  return content;
}

async function readJsonFile(fileInput) {
  const file = fileInput.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    validateContent(parsed);
    setContentForStudio(selectedTemplateId(), parsed, file.name);
    $("json-import-label").textContent = `Selected file: ${file.name}`;
    setStatus("JSON imported into browser session.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    fileInput.value = "";
  }
}

async function applyManualImagePath() {
  try {
    let content;
    try {
      content = parseSessionContent();
    } catch {
      content = await loadSelectedContentIntoSession();
    }

    const cardIndex = Number($("path-card-index").value) - 1;
    const fieldKey = $("path-field-key").value;
    const imagePath = $("manual-image-path").value.trim();

    if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= content.cards.length) {
      throw new Error(`Card must be between 1 and ${content.cards.length}.`);
    }
    if (!imagePath) {
      throw new Error("Image path is required.");
    }

    content.cards[cardIndex][fieldKey] = imagePath;
    setContentForStudio(selectedTemplateId(), content, "Manual image path changes");
    setStatus(`Updated Card ${cardIndex + 1} ${fieldKey}.`, "success");
  } catch (error) {
    setStatus(error.message, "error", error.details || []);
  }
}

function renderWarnings(warnings = []) {
  const root = $("css-import-warnings");
  if (!warnings.length) {
    root.hidden = true;
    root.innerHTML = "";
    return;
  }
  root.hidden = false;
  root.innerHTML = warnings
    .map((warning) => `<div class="mvp-import-alert">${escapeHtml(warning)}</div>`)
    .join("");
}

async function importCss() {
  const css = $("css-source").value.trim();
  const templateIdOverride = $("css-template-id").value.trim();

  if (!css) {
    setStatus("Paste CSS before importing.", "error");
    return;
  }

  $("run-css-import").disabled = true;
  renderWarnings([]);
  setStatus("Importing CSS and creating template...", "loading");

  try {
    const payload = await requestJson("/api/templates/import-css", {
      method: "POST",
      body: JSON.stringify({
        css,
        templateId: templateIdOverride || undefined,
        createNew: true,
        options: {
          frameWidth: 1080,
          frameHeight: 1350
        }
      })
    });

    const nextTemplateId = payload.templateId;
    const mapped = payload.mapped || {};
    if (!nextTemplateId) {
      throw new Error("Import did not return a template id.");
    }
    if (!mapped.content) {
      throw new Error("Import did not return mapped.content.");
    }

    renderWarnings(mapped.warnings || []);
    setContentForStudio(nextTemplateId, mapped.content, null);
    setStatus(`Created template ${nextTemplateId}. Opening Studio...`, "success");
    window.location.href = `/?template=${encodeURIComponent(nextTemplateId)}&from=import`;
  } catch (error) {
    setStatus(error.message, "error", error.details || []);
  } finally {
    $("run-css-import").disabled = false;
  }
}

async function loadTemplates() {
  setStatus("Loading templates...", "loading");
  const payload = await requestJson("/api/templates");
  state.templates = payload.templates || [];
  $("import-template-select").innerHTML = state.templates
    .map((template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name || template.id)}</option>`)
    .join("");

  const fromQuery = new URLSearchParams(window.location.search).get("template");
  if (fromQuery && state.templates.some((item) => item.id === fromQuery)) {
    $("import-template-select").value = fromQuery;
  }

  setStudioLink();
  setStatus("Ready — paste CSS to create a new template", "success");
}

function wireEvents() {
  $("import-template-select").addEventListener("change", () => {
    setStudioLink(selectedTemplateId());
  });
  $("json-content-file").addEventListener("change", (event) => readJsonFile(event.target));
  $("apply-image-path").addEventListener("click", applyManualImagePath);
  $("run-css-import").addEventListener("click", importCss);
}

renderMvpNav("import");
wireEvents();
loadTemplates().catch((error) => setStatus(error.message, "error", error.details || []));
