/**
 * Maps componentized CSS to Remotion-friendly content.json via an LLM.
 *
 * Requires OPENAI_API_KEY in the environment for live calls (never commit secrets).
 * Optional: OPENAI_MODEL (default gpt-4o-mini), OPENAI_BASE_URL (default OpenAI API).
 */

import { mapComponentsToContentDeterministic } from "./css-deterministic-mapper-service.js";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

export class LlmCssMapperError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "LlmCssMapperError";
    this.code = "LLM_MAP_ERROR";
    this.statusCode = 502;
    this.details = details;
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Strip ```json fences from an LLM response before JSON.parse.
 *
 * @param {string} text
 */
export function stripMarkdownJsonFences(text) {
  if (typeof text !== "string") {
    throw new LlmCssMapperError("LLM response must be a string");
  }

  let trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    trimmed = fenceMatch[1].trim();
  }
  return trimmed;
}

/**
 * Parse and validate the JSON object returned by the LLM.
 *
 * @param {string} text
 */
export function parseLlmJsonResponse(text) {
  const jsonText = stripMarkdownJsonFences(text);

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new LlmCssMapperError("LLM response is not valid JSON", [error.message]);
  }

  if (!isRecord(parsed)) {
    throw new LlmCssMapperError("LLM response must be a JSON object");
  }

  return parsed;
}

/**
 * Validate mapped output before returning to clients.
 *
 * @param {unknown} mapped
 */
export function validateMappedOutput(mapped) {
  if (!isRecord(mapped)) {
    throw new LlmCssMapperError("Mapped output must be an object");
  }

  if (!isRecord(mapped.content)) {
    throw new LlmCssMapperError('Mapped output must include a "content" object');
  }

  if (!Array.isArray(mapped.content.cards)) {
    throw new LlmCssMapperError('Mapped content must include a "cards" array');
  }

  if (mapped.content.cards.length === 0) {
    throw new LlmCssMapperError("Mapped content.cards must include at least one card");
  }

  for (const [index, card] of mapped.content.cards.entries()) {
    if (!isRecord(card)) {
      throw new LlmCssMapperError(`cards[${index}] must be an object`);
    }
  }

  if (mapped.schema !== undefined && !isRecord(mapped.schema)) {
    throw new LlmCssMapperError('Mapped "schema" must be an object when provided');
  }

  if (mapped.warnings !== undefined) {
    if (!Array.isArray(mapped.warnings)) {
      throw new LlmCssMapperError('Mapped "warnings" must be an array of strings');
    }
    for (const [index, warning] of mapped.warnings.entries()) {
      if (typeof warning !== "string") {
        throw new LlmCssMapperError(`warnings[${index}] must be a string`);
      }
    }
  }

  return {
    content: mapped.content,
    schema: mapped.schema,
    warnings: Array.isArray(mapped.warnings) ? mapped.warnings : []
  };
}

function summarizeComponent(component) {
  return {
    id: component.id,
    type: component.type,
    role: component.role,
    name: component.name,
    box: component.box,
    style: component.style,
    text: component.text ?? ""
  };
}

/**
 * Build the user prompt for the LLM mapper.
 *
 * @param {Awaited<ReturnType<import("./css-componentizer-service.js").componentizeCss>>} componentized
 * @param {{ templateId?: string }} [options]
 */
export function buildCssMappingPrompt(componentized, options = {}) {
  const components = (componentized.components || []).map(summarizeComponent);
  const frame = componentized.frame || { width: 1080, height: 1350 };
  const variables = componentized.variables || {};

  const exampleCard = {
    title: "",
    titleAccent: "",
    label: "",
    image: "",
    background: "#D9DDE0",
    titleColor: "#0F0F10",
    accentColor: "#D61E23",
    labelColor: "#000000",
    introLayout: "lavash"
  };

  const templateHint = options.templateId
    ? `Suggested template id slug: "${options.templateId}".`
    : "Infer a short kebab-case item slug from component names.";

  return [
    "You map parsed CSS layout components into Remotion template content JSON.",
    "Return ONLY valid JSON (no markdown) with this shape:",
    JSON.stringify(
      {
        content: { item: "example-slug", cards: [exampleCard] },
        schema: { cards: [{ fields: ["title", "titleAccent", "label", "image", "background"] }] },
        warnings: ["optional human-readable notes"]
      },
      null,
      2
    ),
    "",
    "Rules:",
    "- Use cards[] compatible with green-plate-intro / lavash deep-dive templates.",
    "- Leave user-authored text fields empty strings (title, titleAccent, quote, label, brandLeft, brandRight).",
    "- Derive color fields (background, titleColor, accentColor, labelColor, quoteColor, brandColor) from CSS variables or component styles.",
    "- Use empty string for image paths; do not invent file paths.",
    "- For a single-card CSS input, output exactly one card in cards[0].",
    "- schema is optional but helpful: list editable field names per card.",
    "- warnings: note ambiguities, missing roles, or placeholder values.",
    templateHint,
    "",
    `Frame: ${frame.width}x${frame.height}`,
    `CSS variables: ${JSON.stringify(variables)}`,
    `Components: ${JSON.stringify(components, null, 2)}`
  ].join("\n");
}

/**
 * Default OpenAI chat client. Injectable in tests.
 *
 * @param {{ messages: Array<{ role: string, content: string }>, model?: string, apiKey?: string, baseUrl?: string }} params
 */
export async function callOpenAiChat(params) {
  const apiKey = params.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new LlmCssMapperError("OPENAI_API_KEY is not configured");
  }

  const model = params.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  const baseUrl = (params.baseUrl ?? process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL).replace(
    /\/$/,
    ""
  );

  let response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: params.messages
      })
    });
  } catch (error) {
    throw new LlmCssMapperError("LLM request failed", [error.message]);
  }

  if (!response.ok) {
    let details = [];
    try {
      const body = await response.json();
      details = [body.error?.message || JSON.stringify(body)];
    } catch {
      details = [await response.text()];
    }
    throw new LlmCssMapperError(`LLM request failed with status ${response.status}`, details);
  }

  const body = await response.json();
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new LlmCssMapperError("LLM response did not include message content");
  }

  return content;
}

/**
 * Map componentized CSS to content.json + optional schema via LLM.
 * Falls back to the deterministic mapper when OPENAI_API_KEY is missing.
 *
 * @param {Awaited<ReturnType<import("./css-componentizer-service.js").componentizeCss>>} componentized
 * @param {{ templateId?: string, llmClient?: typeof callOpenAiChat, model?: string, apiKey?: string, preferDeterministic?: boolean }} [options]
 */
export async function mapComponentsToContent(componentized, options = {}) {
  if (!componentized || !Array.isArray(componentized.components)) {
    throw new LlmCssMapperError("componentized input must include components[]");
  }

  if (options.preferDeterministic) {
    return mapComponentsToContentDeterministic(componentized, options);
  }

  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey && !options.llmClient) {
    return mapComponentsToContentDeterministic(componentized, options);
  }

  const llmClient = options.llmClient ?? callOpenAiChat;
  const prompt = buildCssMappingPrompt(componentized, options);

  try {
    const rawResponse = await llmClient({
      messages: [
        {
          role: "system",
          content:
            "You are a design-to-Remotion mapper. Output strict JSON only, matching the requested shape."
        },
        { role: "user", content: prompt }
      ],
      model: options.model,
      apiKey: options.apiKey
    });

    const parsed = parseLlmJsonResponse(rawResponse);
    return validateMappedOutput(parsed);
  } catch (error) {
    if (options.llmClient) {
      throw error;
    }
    const fallback = mapComponentsToContentDeterministic(componentized, options);
    fallback.warnings = [
      ...(fallback.warnings || []),
      `LLM mapper unavailable (${error.message}) — used deterministic CSS mapping`
    ];
    return fallback;
  }
}
