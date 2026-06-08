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
  templates: [],
  openTemplateCardId: ""
};

const contentSource = createContentSource();

const $ = (id) => document.getElementById(id);

function formatJson(value) {
  return JSON.stringify(value, null, 2);
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
  const title = humanizeTemplateId(content.item) || humanizeTemplateId(template?.name) || template?.id || "Template";
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
  setOpenTemplateCard(preferredTemplateId || template?.id || "");
  renderTemplateCards();
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
    setOpenTemplateCard($("template-select").value);
    renderTemplateCards();
    setStatus("Ready", "success");
  });
  $("content-file").addEventListener("change", (event) => readContentFile(event.target));

  const cardsGrid = $("template-cards-grid");
  cardsGrid.addEventListener("click", (event) => {
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
}

renderMvpNav("dev");
wireEvents();
setupContentCardsEditor(contentSource, formatJson);
loadTemplates().catch((error) => {
  setStatus(error.message, "error");
});
