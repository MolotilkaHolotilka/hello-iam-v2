import { existsSync } from "node:fs";
import path from "node:path";
import { PATHS } from "../lib/config.js";
import { isLegacyDeepDiveTemplate } from "../lib/template-allowlist.js";
import { CssParseError } from "./css-parse-service.js";
import { componentizeCss } from "./css-componentizer-service.js";
import { updateTemplateContent } from "./content-template-service.js";
import {
  LlmCssMapperError,
  mapComponentsToContent
} from "./llm-css-mapper-service.js";
import { createTemplateFromCssImport } from "./template-workflow-service.js";

const TEMPLATES_ROOT = path.join(
  PATHS.workspaceRoot,
  "apps",
  "helloiam-remotion",
  "src",
  "templates"
);

export class CssImportError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "CssImportError";
    this.code = "CSS_IMPORT_ERROR";
    this.statusCode = 400;
    this.details = details;
  }
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function normalizeFrameOptions(options = {}) {
  const frame = {};
  if (typeof options.frameWidth === "number") {
    frame.width = options.frameWidth;
  }
  if (typeof options.frameHeight === "number") {
    frame.height = options.frameHeight;
  }
  return Object.keys(frame).length ? { frame } : {};
}

function inferTemplateIdFromCss(componentized, explicitId) {
  if (typeof explicitId === "string" && explicitId.trim()) {
    return slugify(explicitId);
  }

  for (const component of componentized.components || []) {
    const selector = component.baseSelector || component.selectors?.[0] || "";
    const root = selector.split(/\s+/)[0]?.replace(/^\./, "") || "";
    if (root && !/^card[_-]?\d*$/i.test(root)) {
      const candidate = slugify(`css-import-${root}`);
      if (candidate) {
        return candidate;
      }
    }
  }

  return `css-import-${Date.now()}`;
}

function resolveUniqueTemplateId(baseId) {
  let templateId = slugify(baseId);
  if (!templateId) {
    templateId = `css-import-${Date.now()}`;
  }

  if (!existsSync(path.join(TEMPLATES_ROOT, templateId))) {
    return templateId;
  }

  let counter = 2;
  while (existsSync(path.join(TEMPLATES_ROOT, `${templateId}-${counter}`))) {
    counter += 1;
  }
  return `${templateId}-${counter}`;
}

function assertLegacyImportAllowed(templateId, force) {
  if (isLegacyDeepDiveTemplate(templateId) && !force) {
    throw new CssImportError(
      `Cannot import into legacy template "${templateId}" without force: true`,
      ["Legacy deep-dive templates are protected until migration sign-off."]
    );
  }
}

/**
 * Parse CSS, componentize, map to Remotion content, and scaffold or update template files.
 *
 * @param {{
 *   css?: string,
 *   templateId?: string,
 *   createNew?: boolean,
 *   force?: boolean,
 *   options?: { frameWidth?: number, frameHeight?: number }
 * }} payload
 * @param {{ llmClient?: Function }} [deps]
 */
export async function importCssToTemplate(payload = {}, deps = {}) {
  const css = payload.css;
  if (typeof css !== "string" || !css.trim()) {
    throw new CssImportError("css must be a non-empty string");
  }

  const createNew = payload.createNew === true;
  const force = payload.force === true;
  const componentizeOptions = normalizeFrameOptions(payload.options);

  let componentized;
  try {
    componentized = await componentizeCss(css, componentizeOptions);
  } catch (error) {
    if (error instanceof CssParseError) {
      throw error;
    }
    throw new CssImportError(error.message, error.details || []);
  }

  let mapped;
  try {
    mapped = await mapComponentsToContent(componentized, {
      templateId: payload.templateId,
      llmClient: deps.llmClient
    });
  } catch (error) {
    if (error instanceof LlmCssMapperError) {
      throw error;
    }
    throw new LlmCssMapperError(error.message, error.details || []);
  }

  let templateId = inferTemplateIdFromCss(componentized, payload.templateId);
  assertLegacyImportAllowed(templateId, force);

  const templateDir = path.join(TEMPLATES_ROOT, templateId);
  const templateExists = existsSync(templateDir);
  const shouldScaffold = !templateExists || createNew;

  if (shouldScaffold) {
    if (templateExists && createNew) {
      templateId = resolveUniqueTemplateId(templateId);
      assertLegacyImportAllowed(templateId, force);
    }

    await createTemplateFromCssImport({
      templateId,
      content: mapped.content
    });
  } else {
    await updateTemplateContent(templateId, mapped.content);
  }

  return {
    ok: true,
    templateId,
    created: shouldScaffold,
    componentized,
    mapped
  };
}
