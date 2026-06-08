import { isParsedCss, parseCss } from "./css-parse-service.js";

const DEFAULT_FRAME = { width: 1080, height: 1350 };

const IMAGE_HINT_PATTERN = /(?:^|[\s.#])(?:image|img|media|photo|hero-image|sticker)(?:$|[\s.#_-])/i;
const TEXT_HINT_PATTERN = /(?:^|[\s.#])(?:title|quote|label|text|heading|subtitle|brand)(?:$|[\s.#_-])/i;
const CONTAINER_HINT_PATTERN = /(?:^|[\s.#])(?:card|frame|canvas|slide)(?:$|[\s.#_-])/i;

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function selectorTail(selector) {
  const parts = selector.split(/\s+/);
  const last = parts[parts.length - 1] || selector;
  return last.replace(/^[^.#]*([.#][\w-]+).*$/, "$1").replace(/^[.#]/, "");
}

function hasTypography(rule) {
  return Object.keys(rule.typography || {}).length > 0;
}

function hasAbsoluteLayout(rule) {
  const position = rule.layout?.position?.raw;
  return position === "absolute" || position === "fixed";
}

function hasSizedBox(rule) {
  return Boolean(rule.layout?.width || rule.layout?.height);
}

function inferComponentType(rule) {
  const selector = rule.baseSelector || rule.selector;
  const hasBackgroundImage = rule.declarations.some(
    (decl) =>
      decl.property === "background-image" &&
      decl.value &&
      decl.value !== "none"
  );
  const hasObjectFit = rule.declarations.some((decl) => decl.property === "object-fit");

  if (hasBackgroundImage || hasObjectFit || IMAGE_HINT_PATTERN.test(selector)) {
    return "image";
  }

  if (hasTypography(rule) || TEXT_HINT_PATTERN.test(selector)) {
    return "text";
  }

  if (hasSizedBox(rule) || hasAbsoluteLayout(rule) || CONTAINER_HINT_PATTERN.test(selector)) {
    return "box";
  }

  return "box";
}

function inferRole(rule, type) {
  const selector = rule.baseSelector || rule.selector;

  if (IMAGE_HINT_PATTERN.test(selector)) return "image";
  if (/(?:^|[\s.#])title-accent(?:$|[\s.#_-])/i.test(selector)) return "title-accent";
  if (/(?:^|[\s.#])title(?:$|[\s.#_-])/i.test(selector)) return "title";
  if (/(?:^|[\s.#])quote(?:$|[\s.#_-])/i.test(selector)) return "quote";
  if (/(?:^|[\s.#])label(?:$|[\s.#_-])/i.test(selector)) return "label";
  if (/(?:^|[\s.#])brand(?:$|[\s.#_-])/i.test(selector)) return "brand";

  if (type === "image") return "image";
  if (type === "text") return "text";
  if (CONTAINER_HINT_PATTERN.test(selector)) return "container";
  return "element";
}

function buildBox(layout = {}) {
  const read = (key) => layout[key] || null;
  const toCoord = (entry) =>
    entry && typeof entry.value === "number"
      ? { value: entry.value, unit: entry.unit || "px", raw: entry.raw }
      : null;

  return {
    position: read("position")?.raw || null,
    x: toCoord(read("left")),
    y: toCoord(read("top")),
    right: toCoord(read("right")),
    bottom: toCoord(read("bottom")),
    width: toCoord(read("width")),
    height: toCoord(read("height")),
    display: read("display")?.raw || null,
    flexDirection: read("flex-direction")?.raw || null,
    alignItems: read("align-items")?.raw || null,
    justifyContent: read("justify-content")?.raw || null,
    gap: toCoord(read("gap")),
    overflow: read("overflow")?.raw || null,
    zIndex: toCoord(read("z-index"))
  };
}

function componentHintsFromRule(rule, context = {}) {
  return {
    positioned: hasAbsoluteLayout(rule),
    hasTextStyles: hasTypography(rule),
    hasColor: Object.keys(rule.colors || {}).length > 0,
    inferredType: context.type || null,
    inferredRole: context.role || null
  };
}

function buildStyle(rule) {
  const style = {};

  for (const section of [rule.layout, rule.typography, rule.colors]) {
    for (const [property, entry] of Object.entries(section || {})) {
      style[property] = entry.raw;
    }
  }

  for (const decl of rule.declarations) {
    if (
      decl.property.startsWith("background") ||
      decl.property.startsWith("border") ||
      decl.property === "opacity" ||
      decl.property === "transform" ||
      decl.property === "object-fit" ||
      decl.property === "object-position"
    ) {
      style[decl.property] = decl.value;
    }
  }

  return style;
}

function detectFrame(rules, options = {}) {
  if (isRecord(options.frame)) {
    return { ...DEFAULT_FRAME, ...options.frame };
  }

  for (const rule of rules) {
    const width = rule.layout?.width?.value;
    const height = rule.layout?.height?.value;
    if (width === 1080 && height === 1350) {
      return { width, height };
    }
  }

  return { ...DEFAULT_FRAME };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function shouldSkipRule(rule) {
  if (rule.pseudo) return true;
  if (rule.selector.includes(":root")) return true;
  return false;
}

function buildComponent(rule, index, usedIds) {
  const type = inferComponentType(rule);
  const role = inferRole(rule, type);
  const tail = selectorTail(rule.baseSelector || rule.selector);
  let id = slugify(tail || `component-${index + 1}`) || `component-${index + 1}`;

  if (rule.mediaQuery) {
    id = `${id}-mq${index + 1}`;
  } else if (usedIds.has(id)) {
    id = `${id}-${index + 1}`;
  }
  usedIds.add(id);

  return {
    id,
    type,
    role,
    name: tail || id,
    selectors: [rule.selector],
    baseSelector: rule.baseSelector,
    mediaQuery: rule.mediaQuery,
    box: buildBox(rule.layout),
    style: buildStyle(rule),
    text: "",
    hints: componentHintsFromRule(rule, { type, role })
  };
}

/**
 * Group parsed CSS rules into logical components for LLM / Remotion mapping.
 *
 * @param {Awaited<ReturnType<typeof parseCss>>} parsed
 * @param {{ frame?: { width?: number, height?: number }, includeRoot?: boolean }} [options]
 */
export function componentizeParsedCss(parsed, options = {}) {
  if (!isParsedCss(parsed)) {
    throw new TypeError("componentizeParsedCss expects output from parseCss()");
  }

  const candidates = parsed.rules.filter((rule) => !shouldSkipRule(rule));
  const usedIds = new Set();
  const components = candidates.map((rule, index) => buildComponent(rule, index, usedIds));

  return {
    version: 1,
    source: "css-componentizer",
    frame: detectFrame(parsed.rules, options),
    variables: parsed.variables,
    components,
    meta: {
      ruleCount: parsed.meta?.ruleCount ?? parsed.rules.length,
      componentCount: components.length
    }
  };
}

/**
 * Parse CSS and componentize in one step.
 *
 * @param {string} css
 * @param {object} [options]
 */
export async function componentizeCss(css, options = {}) {
  const parsed = await parseCss(css, options);
  return componentizeParsedCss(parsed, options);
}
