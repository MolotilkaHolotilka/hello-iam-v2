import { validateMappedOutput } from "./llm-css-mapper-service.js";

const COLOR_VAR_MAP = {
  "--background": "background",
  "--bg": "background",
  "--accent": "accentColor",
  "--title-color": "titleColor",
  "--title": "titleColor",
  "--label-color": "labelColor",
  "--quote-color": "quoteColor",
  "--brand-color": "brandColor"
};

const ROLE_FIELD_MAP = {
  title: "title",
  "title-accent": "titleAccent",
  quote: "quote",
  label: "label",
  brand: "brandLeft"
};

const DEFAULT_CARD_COLORS = {
  background: "#D9DDE0",
  titleColor: "#0F0F10",
  accentColor: "#D61E23",
  labelColor: "#000000",
  quoteColor: "#D61E23",
  brandColor: "#420000"
};

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeHex(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) {
    return trimmed.length === 4
      ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
      : trimmed.slice(0, 7).toUpperCase();
  }
  return null;
}

function resolveCssVar(value, variables = {}) {
  if (typeof value !== "string") return value;
  const match = value.trim().match(/^var\(\s*(--[^,)]+)(?:\s*,\s*([^)]+))?\s*\)$/i);
  if (!match) return value;
  const varName = match[1].trim();
  const fallback = match[2]?.trim();
  if (variables[varName] !== undefined) {
    return variables[varName];
  }
  return fallback || value;
}

function detectCardIndex(component) {
  const selector = component.baseSelector || component.selectors?.[0] || component.name || "";
  const match = selector.match(/(?:^|[\s.#])card[_-](\d+)(?:$|[\s.#_-])/i);
  if (match) return Number(match[1]);
  return 1;
}

function inferIntroLayout(componentized, templateId) {
  const haystack = [
    templateId || "",
    ...(componentized.components || []).map((component) => component.name || ""),
    ...(componentized.components || []).map((component) => component.baseSelector || "")
  ]
    .join(" ")
    .toLowerCase();

  if (haystack.includes("dolma")) return "dolma";
  if (haystack.includes("matsun")) return "matsun";
  if (haystack.includes("khachkar")) return "khachkar";
  return "lavash";
}

function inferItemSlug(componentized, templateId) {
  if (templateId) {
    return templateId.replace(/^css-import-/, "").replace(/^i-am-/, "").replace(/-deep-dive$/, "");
  }

  for (const component of componentized.components || []) {
    const selector = component.baseSelector || "";
    const match = selector.match(/\.card[_-](\d+)/i);
    if (match) {
      const root = selector.split(/\s+/)[0]?.replace(/^\./, "") || "";
      if (root && !/^card[_-]\d+$/i.test(root)) {
        return root.replace(/^card[_-]/i, "");
      }
    }
  }

  return "imported-card";
}

function groupComponentsByCard(components) {
  const groups = new Map();
  for (const component of components) {
    const cardIndex = detectCardIndex(component);
    if (!groups.has(cardIndex)) {
      groups.set(cardIndex, []);
    }
    groups.get(cardIndex).push(component);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]);
}

function applyVariableColors(card, variables) {
  for (const [varName, field] of Object.entries(COLOR_VAR_MAP)) {
    const raw = variables[varName];
    const hex = normalizeHex(resolveCssVar(raw, variables));
    if (hex) {
      card[field] = hex;
    }
  }
}

function applyComponentColors(card, component) {
  const style = component.style || {};
  const color = normalizeHex(resolveCssVar(style.color, {}));
  const background = normalizeHex(
    resolveCssVar(style["background-color"] || style.background, {})
  );

  if (component.role === "title" && color) card.titleColor = color;
  if (component.role === "title-accent" && color) card.accentColor = color;
  if (component.role === "label" && color) card.labelColor = color;
  if (component.role === "quote" && color) card.quoteColor = color;
  if (component.role === "brand" && color) card.brandColor = color;
  if (component.role === "container" && background) card.background = background;
}

function applyComponentText(card, component) {
  const text = typeof component.text === "string" ? component.text.trim() : "";
  if (!text) return;

  const field = ROLE_FIELD_MAP[component.role];
  if (field && !card[field]) {
    card[field] = text;
    return;
  }

  if (component.role === "text" && !card.quote && text.length > 24) {
    card.quote = text;
    return;
  }

  if (!card.title && (component.role === "text" || component.type === "text")) {
    card.title = text;
  }
}

function buildHelloCard(componentized, templateId) {
  const card = {
    title: "",
    titleAccent: "",
    label: "",
    image: "",
    ...DEFAULT_CARD_COLORS,
    introLayout: inferIntroLayout(componentized, templateId)
  };
  applyVariableColors(card, componentized.variables || {});
  return card;
}

function buildQuoteCard(componentized) {
  const card = {
    title: "",
    titleAccent: "",
    quote: "",
    label: "",
    image: "",
    ...DEFAULT_CARD_COLORS
  };
  applyVariableColors(card, componentized.variables || {});
  return card;
}

function buildBrandCard(componentized) {
  const card = {
    brandLeft: "helloiam",
    brandRight: "am",
    image: "",
    background: DEFAULT_CARD_COLORS.background,
    brandColor: DEFAULT_CARD_COLORS.brandColor
  };
  applyVariableColors(card, componentized.variables || {});
  return card;
}

function buildSchema(cards) {
  return {
    cards: cards.map((card) => ({
      fields: Object.keys(card)
    }))
  };
}

function collectWarnings(cards, componentized) {
  const warnings = [];
  const hasText = (componentized.components || []).some(
    (component) => typeof component.text === "string" && component.text.trim()
  );

  if (!hasText) {
    warnings.push("No text found in CSS content: properties — edit titles in Studio");
  }

  if (cards.some((card) => !card.image)) {
    warnings.push("Image path left empty — upload in Studio");
  }

  return warnings;
}

/**
 * Map componentized CSS to green-plate content without an LLM.
 *
 * @param {Awaited<ReturnType<import("./css-componentizer-service.js").componentizeCss>>} componentized
 * @param {{ templateId?: string }} [options]
 */
export function mapComponentsToContentDeterministic(componentized, options = {}) {
  if (!componentized || !Array.isArray(componentized.components)) {
    throw new TypeError("componentized input must include components[]");
  }

  const groups = groupComponentsByCard(componentized.components);
  const cardCount = groups.length || 1;
  const cards = [];

  for (let index = 0; index < cardCount; index += 1) {
    const [, groupComponents] = groups[index] || [index + 1, []];
    let card;

    if (index === 0) {
      card = buildHelloCard(componentized, options.templateId);
    } else if (index === cardCount - 1 && cardCount > 1) {
      card = buildBrandCard(componentized);
    } else {
      card = buildQuoteCard(componentized);
    }

    for (const component of groupComponents) {
      applyComponentText(card, component);
      applyComponentColors(card, component);
      if (component.role === "image" || component.type === "image") {
        card.image = "";
      }
    }

    cards.push(card);
  }

  if (!cards.length) {
    cards.push(buildHelloCard(componentized, options.templateId));
  }

  const mapped = {
    content: {
      item: inferItemSlug(componentized, options.templateId),
      cards
    },
    schema: buildSchema(cards),
    warnings: collectWarnings(cards, componentized)
  };

  return validateMappedOutput(mapped);
}
