import { readFile } from "node:fs/promises";
import postcss from "postcss";

const LAYOUT_PROPERTIES = new Set([
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "width",
  "height",
  "display",
  "flex",
  "flex-direction",
  "flex-wrap",
  "align-items",
  "justify-content",
  "gap",
  "overflow",
  "z-index"
]);

const TYPOGRAPHY_PROPERTIES = new Set([
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-transform",
  "text-align",
  "white-space"
]);

const COLOR_PROPERTIES = new Set([
  "color",
  "background",
  "background-color",
  "border-color"
]);

const PSEUDO_PATTERN = /:+(?:hover|active|focus|focus-visible|focus-within|visited|before|after|first-child|last-child|nth-child\([^)]+\)|not\([^)]+\))/;

export class CssParseError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "CssParseError";
    this.code = "CSS_PARSE_ERROR";
    this.statusCode = 400;
    this.details = details;
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeSelector(selector) {
  return selector.replace(/\s+/g, " ").trim();
}

function splitSelectorParts(selector) {
  const normalized = normalizeSelector(selector);
  const pseudoMatches = [];
  let baseSelector = normalized;

  for (const match of normalized.matchAll(/:+(?:hover|active|focus|focus-visible|focus-within|visited|before|after|first-child|last-child|nth-child\([^)]+\)|not\([^)]+\))/g)) {
    pseudoMatches.push(match[0]);
  }

  if (pseudoMatches.length) {
    baseSelector = normalized.replace(PSEUDO_PATTERN, "");
    baseSelector = baseSelector.replace(/\s+/g, " ").trim();
  }

  return {
    selector: normalized,
    baseSelector: baseSelector || normalized,
    pseudo: pseudoMatches.length ? pseudoMatches.join("") : null
  };
}

function parseNumericValue(rawValue) {
  if (typeof rawValue !== "string") {
    return { raw: rawValue, value: null, unit: null };
  }

  const trimmed = rawValue.trim();
  const match = trimmed.match(/^(-?\d*\.?\d+)(%|px|rem|em|vh|vw)?$/);
  if (!match) {
    return { raw: trimmed, value: null, unit: null };
  }

  return {
    raw: trimmed,
    value: Number(match[1]),
    unit: match[2] || null
  };
}

function declarationsToMap(declarations) {
  const map = {};
  for (const declaration of declarations) {
    map[declaration.property] = declaration;
  }
  return map;
}

function pickSection(declMap, propertyNames) {
  const section = {};
  for (const property of propertyNames) {
    if (!declMap[property]) continue;
    section[property] = {
      raw: declMap[property].value,
      ...parseNumericValue(declMap[property].value)
    };
  }
  return section;
}

function normalizeDeclaration(decl) {
  const property = decl.prop.trim().toLowerCase();
  const value = decl.value.trim();
  return {
    property,
    value,
    important: decl.important,
    raw: `${property}: ${value}${decl.important ? " !important" : ""};`
  };
}

function walkRules(root, visitor, context = {}) {
  root.walkRules((rule) => {
    const parent = rule.parent;
    const mediaQuery =
      parent && parent.type === "atrule" && parent.name === "media"
        ? parent.params.trim()
        : context.mediaQuery || null;

    visitor(rule, { mediaQuery });
  });
}

function collectCustomProperties(root) {
  const variables = {};

  root.walkRules((rule) => {
    if (!rule.selector || !rule.selector.includes(":root")) return;
    for (const decl of rule.nodes || []) {
      if (decl.type !== "decl" || !decl.prop.startsWith("--")) continue;
      variables[decl.prop.trim()] = decl.value.trim();
    }
  });

  return variables;
}

function normalizeRule(rule, context = {}) {
  const selectorParts = splitSelectorParts(rule.selector);
  const declarations = (rule.nodes || [])
    .filter((node) => node.type === "decl")
    .map(normalizeDeclaration);
  const declMap = declarationsToMap(declarations);

  return {
    selector: selectorParts.selector,
    baseSelector: selectorParts.baseSelector,
    pseudo: selectorParts.pseudo,
    mediaQuery: context.mediaQuery || null,
    declarations,
    layout: pickSection(declMap, LAYOUT_PROPERTIES),
    typography: pickSection(declMap, TYPOGRAPHY_PROPERTIES),
    colors: pickSection(declMap, COLOR_PROPERTIES)
  };
}

/**
 * Parse a CSS string into normalized rules and extracted layout hints.
 *
 * @param {string} css
 * @param {{ from?: string }} [options]
 * @returns {Promise<{
 *   version: number,
 *   source: string,
 *   variables: Record<string, string>,
 *   rules: Array<{
 *     selector: string,
 *     baseSelector: string,
 *     pseudo: string | null,
 *     mediaQuery: string | null,
 *     declarations: Array<{ property: string, value: string, important: boolean, raw: string }>,
 *     layout: Record<string, { raw: string, value: number | null, unit: string | null }>,
 *     typography: Record<string, { raw: string, value: number | null, unit: string | null }>,
 *     colors: Record<string, { raw: string, value: number | null, unit: string | null }>
 *   }>,
 *   meta: { ruleCount: number, variableCount: number }
 * }>}
 */
export async function parseCss(css, options = {}) {
  if (typeof css !== "string" || !css.trim()) {
    throw new CssParseError("CSS input must be a non-empty string");
  }

  let root;
  try {
    root = postcss.parse(css, { from: options.from });
  } catch (error) {
    throw new CssParseError("CSS could not be parsed", [error.message]);
  }

  const variables = collectCustomProperties(root);
  const rules = [];

  walkRules(root, (rule, context) => {
    rules.push(normalizeRule(rule, context));
  });

  return {
    version: 1,
    source: "css",
    variables,
    rules,
    meta: {
      ruleCount: rules.length,
      variableCount: Object.keys(variables).length
    }
  };
}

/**
 * Read a CSS file from disk and parse it.
 *
 * @param {string} filePath
 * @param {object} [options]
 */
export async function parseCssFile(filePath, options = {}) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new CssParseError("CSS file path must be a non-empty string");
  }

  let css;
  try {
    css = await readFile(filePath, "utf8");
  } catch (error) {
    throw new CssParseError(`CSS file could not be read: ${filePath}`, [error.message]);
  }

  return parseCss(css, { ...options, from: filePath });
}

export function isParsedCss(value) {
  return isRecord(value) && value.version === 1 && Array.isArray(value.rules);
}
