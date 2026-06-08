import { CssParseError } from "./css-parse-service.js";
import { componentizeCss } from "./css-componentizer-service.js";
import {
  LlmCssMapperError,
  mapComponentsToContent
} from "./llm-css-mapper-service.js";

export class CssImportError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "CssImportError";
    this.code = "CSS_IMPORT_ERROR";
    this.statusCode = 400;
    this.details = details;
  }
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

/**
 * Parse CSS, componentize, and map to Remotion content via LLM.
 *
 * @param {{ css?: string, templateId?: string, options?: { frameWidth?: number, frameHeight?: number } }} payload
 * @param {{ llmClient?: Function }} [deps]
 */
export async function importCssToTemplate(payload = {}, deps = {}) {
  const css = payload.css;
  if (typeof css !== "string" || !css.trim()) {
    throw new CssImportError("css must be a non-empty string");
  }

  const templateId =
    typeof payload.templateId === "string" && payload.templateId.trim()
      ? payload.templateId.trim()
      : undefined;

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
      templateId,
      llmClient: deps.llmClient
    });
  } catch (error) {
    if (error instanceof LlmCssMapperError) {
      throw error;
    }
    throw new LlmCssMapperError(error.message, error.details || []);
  }

  return {
    ok: true,
    templateId,
    componentized,
    mapped
  };
}
