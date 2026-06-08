import {
  renderCardPreviewInner,
  renderCardPreviewSlide
} from "./mvp-card-preview.js";

const cardsEditorState = {
  activeIndex: 0,
  syncing: false,
  debounceTimer: null,
  layoutTimer: null,
  workflow: { width: 1080, height: 1350 },
  templateId: "",
  assetPaths: [],
  uploadHandler: null,
  changeHandler: null
};

const COLOR_KEY =
  /^(background|titleColor|accentColor|quoteColor|brandColor)$/i;
const IMAGE_KEY = /^(image|backgroundImage)$/i;
const MULTILINE_KEY = /^(title|titleAccent|quote|brandLeft|brandRight)$/i;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function isHexColor(value) {
  return typeof value === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

function fieldKind(key, value) {
  if (COLOR_KEY.test(key) || isHexColor(value)) return "color";
  if (IMAGE_KEY.test(key)) return "image";
  if (
    MULTILINE_KEY.test(key) ||
    (typeof value === "string" && value.includes("\n"))
  ) {
    return "textarea";
  }
  return "text";
}

export function parseContentCards(text) {
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, error: "Content JSON must be an object." };
    }
    if (!Array.isArray(data.cards)) {
      return { ok: false, error: 'Content JSON must include a "cards" array.' };
    }
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function assetPreviewUrl(imagePath) {
  if (!imagePath || typeof imagePath !== "string") return "";
  const normalized = imagePath.replace(/^\/+/, "");
  return `/assets/${normalized}`;
}

function renderField(key, value, cardIndex) {
  const id = `card-field-${cardIndex}-${key}`;
  const kind = fieldKind(key, value);
  const label = `<label class="mvp-card-field" for="${escapeHtml(id)}"><span>${escapeHtml(key)}</span>`;

  if (kind === "color") {
    const colorValue = isHexColor(value) ? value : "#000000";
    return `${label}
      <div class="mvp-card-color-row">
        <input type="color" data-card-index="${cardIndex}" data-field-key="${escapeHtml(key)}" value="${escapeHtml(colorValue)}" />
        <input type="text" id="${escapeHtml(id)}" data-card-index="${cardIndex}" data-field-key="${escapeHtml(key)}" value="${escapeHtml(value ?? "")}" spellcheck="false" />
      </div>
    </label>`;
  }

  if (kind === "image") {
    const preview = assetPreviewUrl(value);
    return `${label}
      <input type="hidden" id="${escapeHtml(id)}" data-card-index="${cardIndex}" data-field-key="${escapeHtml(key)}" value="${escapeHtml(value ?? "")}" />
      <code class="mvp-card-image-path">${escapeHtml(value || "No image selected")}</code>
      <div class="mvp-card-upload-row">
        <input type="file" id="${escapeHtml(id)}-upload" data-image-upload="true" data-card-index="${cardIndex}" data-field-key="${escapeHtml(key)}" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" />
        <span>Upload image</span>
      </div>
      ${preview ? `<img class="mvp-card-image-preview" data-preview-for="${escapeHtml(id)}" src="${escapeHtml(preview)}" alt="" />` : ""}
    </label>`;
  }

  if (kind === "textarea") {
    return `${label}
      <textarea id="${escapeHtml(id)}" data-card-index="${cardIndex}" data-field-key="${escapeHtml(key)}" rows="3" spellcheck="false">${escapeHtml(value ?? "")}</textarea>
    </label>`;
  }

  return `${label}
    <input type="text" id="${escapeHtml(id)}" data-card-index="${cardIndex}" data-field-key="${escapeHtml(key)}" value="${escapeHtml(value ?? "")}" spellcheck="false" />
  </label>`;
}

function renderRootField(key, value) {
  const id = `content-root-${key}`;
  return `<label class="mvp-card-field mvp-card-field-root" for="${escapeHtml(id)}">
    <span>${escapeHtml(key)}</span>
    <input type="text" id="${escapeHtml(id)}" data-root-key="${escapeHtml(key)}" value="${escapeHtml(value ?? "")}" spellcheck="false" />
  </label>`;
}

function renderCardNav(count, activeIndex) {
  if (count <= 0) return "";
  const buttons = Array.from({ length: count }, (_, index) => {
    const active = index === activeIndex ? " is-active" : "";
    return `<button type="button" class="mvp-card-tab${active}" data-card-index="${index}" aria-current="${index === activeIndex ? "true" : "false"}">Card ${index + 1}</button>`;
  }).join("");

  return `
    <div class="mvp-cards-nav-inner">
      <button type="button" class="mvp-card-arrow" data-card-nav="prev" aria-label="Previous card">←</button>
      ${buttons}
      <button type="button" class="mvp-card-arrow" data-card-nav="next" aria-label="Next card">→</button>
    </div>
    <p class="mvp-cards-counter">Card ${activeIndex + 1} of ${count}</p>
  `;
}

function renderCardPanel(card, cardIndex) {
  const keys = Object.keys(card || {});
  if (!keys.length) {
    return `<p class="mvp-cards-empty">This card has no fields yet.</p>`;
  }
  return `<div class="mvp-card-fields">${keys.map((key) => renderField(key, card[key], cardIndex)).join("")}</div>`;
}

function setCardsSectionVisible(visible) {
  const section = document.getElementById("content-cards-section");
  section.hidden = !visible;
}

function setCardsError(message) {
  const errorEl = document.getElementById("content-cards-error");
  if (!message) {
    errorEl.hidden = true;
    errorEl.textContent = "";
    return;
  }
  errorEl.hidden = false;
  errorEl.textContent = message;
}

export function setContentCardsWorkflow(workflow = {}) {
  const width = Number(workflow.width) || 1080;
  const height = Number(workflow.height) || 1350;
  cardsEditorState.workflow = { width, height };
  layoutContentCarousel();
}

export function setContentCardsAssetPaths(assetPaths = [], templateId = "") {
  cardsEditorState.assetPaths = Array.isArray(assetPaths) ? assetPaths : [];
  cardsEditorState.templateId = templateId || "";
  updateAssetDatalist();
}

export function setContentCardsUploadHandler(handler) {
  cardsEditorState.uploadHandler = typeof handler === "function" ? handler : null;
}

export function setContentCardsChangeHandler(handler) {
  cardsEditorState.changeHandler = typeof handler === "function" ? handler : null;
}

function updateAssetDatalist() {
  let datalist = document.getElementById("content-asset-paths");
  if (!datalist) {
    datalist = document.createElement("datalist");
    datalist.id = "content-asset-paths";
    document.body.appendChild(datalist);
  }
  datalist.innerHTML = cardsEditorState.assetPaths
    .map((assetPath) => `<option value="${escapeHtml(assetPath)}"></option>`)
    .join("");
}

function navigateCards(contentSource, formatJson, delta) {
  const parsed = getParsedContent(contentSource);
  if (!parsed.ok || !parsed.data.cards.length) return;
  const count = parsed.data.cards.length;
  cardsEditorState.activeIndex =
    (cardsEditorState.activeIndex + delta + count) % count;
  renderContentCardsEditor(contentSource, formatJson);
}

function setCarouselShellVisible(visible) {
  const shell = document.getElementById("content-cards-carousel-shell");
  if (shell) shell.hidden = !visible;
}

function updateCarouselSlideStates(activeIndex, total) {
  const track = document.getElementById("content-cards-carousel-track");
  if (!track) return;
  track.querySelectorAll(".mvp-carousel-slide").forEach((slide, index) => {
    slide.classList.toggle("is-active", index === activeIndex);
    slide.classList.toggle("is-adjacent", Math.abs(index - activeIndex) === 1);
  });
}

function layoutContentCarousel() {
  const viewport = document.getElementById("content-cards-carousel-viewport");
  const track = document.getElementById("content-cards-carousel-track");
  if (!viewport || !track || track.children.length === 0) return;

  const { width: cardW, height: cardH } = cardsEditorState.workflow;
  const aspect = cardW / cardH;
  const viewportWidth = viewport.clientWidth || 320;
  const maxHeight = Math.min(window.innerHeight * 0.52, 520);
  let slideHeight = maxHeight;
  let slideWidth = slideHeight * aspect;

  const maxWidth = viewportWidth * 0.68;
  if (slideWidth > maxWidth) {
    slideWidth = maxWidth;
    slideHeight = slideWidth / aspect;
  }

  const gap = 20;
  viewport.style.setProperty("--carousel-slide-width", `${Math.round(slideWidth)}px`);
  viewport.style.setProperty("--carousel-slide-height", `${Math.round(slideHeight)}px`);
  viewport.style.setProperty("--card-aspect-w", String(cardW));
  viewport.style.setProperty("--card-aspect-h", String(cardH));

  const step = slideWidth + gap;
  const offset = (viewportWidth - slideWidth) / 2 - cardsEditorState.activeIndex * step;
  track.style.transform = `translateX(${offset}px)`;
  updateCarouselSlideStates(cardsEditorState.activeIndex, track.children.length);
}

function scheduleCarouselLayout() {
  clearTimeout(cardsEditorState.layoutTimer);
  cardsEditorState.layoutTimer = setTimeout(() => layoutContentCarousel(), 50);
}

function renderContentCarousel(cards) {
  const track = document.getElementById("content-cards-carousel-track");
  if (!track) return;
  const total = cards.length;
  track.innerHTML = cards
    .map((card, index) => renderCardPreviewSlide(card, index, total))
    .join("");
  setCarouselShellVisible(total > 0);
  scheduleCarouselLayout();
}

function refreshCarouselSlide(card, index, total) {
  const track = document.getElementById("content-cards-carousel-track");
  if (!track) return;
  const slide = track.querySelector(`[data-carousel-slide="${index}"]`);
  if (!slide) return;
  const frame = slide.querySelector(".mvp-pv-frame");
  if (!frame) return;
  frame.innerHTML = renderCardPreviewInner(card, index, total);
}

function refreshAllCarouselSlides(cards) {
  cards.forEach((card, index) => refreshCarouselSlide(card, index, cards.length));
  scheduleCarouselLayout();
}

export function writeContentJson(contentSource, data, formatJson) {
  cardsEditorState.syncing = true;
  contentSource.setValue(formatJson(data));
  cardsEditorState.syncing = false;
}

function getParsedContent(contentSource) {
  return parseContentCards(contentSource.getValue());
}

function updateImagePreviews(root) {
  root.querySelectorAll("[data-preview-for]").forEach((img) => {
    const input = document.getElementById(img.dataset.previewFor);
    if (!input) return;
    const next = assetPreviewUrl(input.value.trim());
    if (next) {
      img.hidden = false;
      img.src = `${next}?t=${Date.now()}`;
    } else {
      img.hidden = true;
      img.removeAttribute("src");
    }
  });
}

export function renderContentCardsEditor(contentSource, formatJson, options = {}) {
  const parsed = getParsedContent(contentSource);
  if (!parsed.ok) {
    setCardsSectionVisible(false);
    setCarouselShellVisible(false);
    setCardsError(parsed.error);
    return;
  }

  setCardsError("");
  setCardsSectionVisible(true);

  const { data } = parsed;
  const cards = data.cards;
  const previousCount = document
    .getElementById("content-cards-carousel-track")
    ?.querySelectorAll(".mvp-carousel-slide").length;

  if (cardsEditorState.activeIndex >= cards.length) {
    cardsEditorState.activeIndex = Math.max(0, cards.length - 1);
  }

  const rootFieldsEl = document.getElementById("content-root-fields");
  const rootEntries = Object.entries(data).filter(([key]) => key !== "cards");
  rootFieldsEl.innerHTML = rootEntries.length
    ? rootEntries.map(([key, value]) => renderRootField(key, value)).join("")
    : "";

  const navEl = document.getElementById("content-cards-nav");
  navEl.innerHTML = cards.length ? renderCardNav(cards.length, cardsEditorState.activeIndex) : "";

  if (previousCount !== cards.length || !options.preservePanel) {
    renderContentCarousel(cards);
  } else {
    refreshAllCarouselSlides(cards);
    scheduleCarouselLayout();
  }

  const panelEl = document.getElementById("content-card-panel");
  const activeCard = cards[cardsEditorState.activeIndex];
  if (!options.preservePanel) {
    panelEl.innerHTML = cards.length
      ? `<header class="mvp-card-panel-head"><h3>Card ${cardsEditorState.activeIndex + 1}</h3></header>${renderCardPanel(activeCard, cardsEditorState.activeIndex)}`
      : `<p class="mvp-cards-empty">Select a content JSON file with a "cards" array.</p>`;
    updateImagePreviews(panelEl);
  }

  document.getElementById("content-cards-hint").textContent =
    cards.length === 1
      ? "1 card — preview above, edit fields below."
      : `${cards.length} cards — use arrows or tabs to switch.`;
}

function applyFieldChange(contentSource, formatJson, { cardIndex, rootKey, fieldKey, value }) {
  const parsed = getParsedContent(contentSource);
  if (!parsed.ok) return;

  const next = structuredClone(parsed.data);
  if (rootKey) {
    next[rootKey] = value;
  } else if (typeof cardIndex === "number" && fieldKey) {
    if (!next.cards[cardIndex]) next.cards[cardIndex] = {};
    next.cards[cardIndex][fieldKey] = value;
  }

  writeContentJson(contentSource, next, formatJson);
  cardsEditorState.changeHandler?.(next);
}

function syncColorInputs(source) {
  const row = source.closest(".mvp-card-color-row");
  if (!row) return;
  const colorInput = row.querySelector('input[type="color"]');
  const textInput = row.querySelector('input[type="text"]');
  if (!colorInput || !textInput) return;
  if (source.type === "color") {
    textInput.value = source.value;
  } else if (isHexColor(textInput.value)) {
    colorInput.value = textInput.value;
  }
}

export function setupContentCardsEditor(contentSource, formatJson) {
  const section = document.getElementById("content-cards-section");
  section.addEventListener("input", (event) => {
    if (cardsEditorState.syncing) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const rootKey = target.getAttribute("data-root-key");
    const fieldKey = target.getAttribute("data-field-key");
    const cardIndexRaw = target.getAttribute("data-card-index");

    if (!rootKey && !fieldKey) return;

    syncColorInputs(target);

    const value =
      target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement
        ? target.value
        : "";

    applyFieldChange(contentSource, formatJson, {
      rootKey: rootKey || undefined,
      cardIndex: cardIndexRaw !== null ? Number(cardIndexRaw) : undefined,
      fieldKey: fieldKey || undefined,
      value
    });

    const parsedAfter = getParsedContent(contentSource);
    if (parsedAfter.ok) {
      const cards = parsedAfter.data.cards;
      const cardIndex = cardIndexRaw !== null ? Number(cardIndexRaw) : null;
      if (typeof cardIndex === "number" && cards[cardIndex]) {
        refreshCarouselSlide(cards[cardIndex], cardIndex, cards.length);
      }
    }

    if (fieldKey && IMAGE_KEY.test(fieldKey)) {
      updateImagePreviews(document.getElementById("content-card-panel"));
    }
  });

  section.addEventListener("change", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.dataset.imageUpload !== "true") return;

    const file = target.files?.[0];
    const cardIndexRaw = target.getAttribute("data-card-index");
    const fieldKey = target.getAttribute("data-field-key");
    if (!file || cardIndexRaw === null || !fieldKey || !cardsEditorState.uploadHandler) {
      target.value = "";
      return;
    }

    target.disabled = true;
    try {
      const result = await cardsEditorState.uploadHandler(file, {
        cardIndex: Number(cardIndexRaw),
        fieldKey,
        templateId: cardsEditorState.templateId
      });
      if (result?.assetPaths) {
        setContentCardsAssetPaths(result.assetPaths, cardsEditorState.templateId);
      }
      if (result?.path) {
        applyFieldChange(contentSource, formatJson, {
          cardIndex: Number(cardIndexRaw),
          fieldKey,
          value: result.path
        });
        renderContentCardsEditor(contentSource, formatJson);
      }
    } finally {
      target.value = "";
      target.disabled = false;
    }
  });

  section.addEventListener("click", (event) => {
    const carouselNav = event.target.closest("[data-carousel-nav]");
    if (carouselNav) {
      const delta = carouselNav.dataset.carouselNav === "next" ? 1 : -1;
      navigateCards(contentSource, formatJson, delta);
      return;
    }

    const carouselSlide = event.target.closest("[data-carousel-slide]");
    if (carouselSlide) {
      const index = Number(carouselSlide.dataset.carouselSlide);
      if (index !== cardsEditorState.activeIndex) {
        cardsEditorState.activeIndex = index;
        renderContentCardsEditor(contentSource, formatJson);
      }
      return;
    }

    const target = event.target.closest("[data-card-index], [data-card-nav]");
    if (!target) return;

    const parsed = getParsedContent(contentSource);
    if (!parsed.ok) return;
    const count = parsed.data.cards.length;

    if (target.hasAttribute("data-card-nav")) {
      const delta = target.dataset.cardNav === "next" ? 1 : -1;
      navigateCards(contentSource, formatJson, delta);
      return;
    }

    if (target.classList.contains("mvp-card-tab")) {
      cardsEditorState.activeIndex = Number(target.dataset.cardIndex);
      renderContentCardsEditor(contentSource, formatJson);
    }
  });

  window.addEventListener("resize", scheduleCarouselLayout);

  renderContentCardsEditor(contentSource, formatJson);
}

export function refreshContentCardsEditor(contentSource, formatJson) {
  renderContentCardsEditor(contentSource, formatJson);
}
