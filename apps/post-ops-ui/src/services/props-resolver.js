const ANIMATION_PRESETS = ["clean-rise", "slide-fly", "soft-float"];
const RESERVED_PATH_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export class RenderValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "RenderValidationError";
    this.code = "VALIDATION_ERROR";
    this.statusCode = 400;
    this.details = details;
  }
}

function isObject(value) {
  return value !== null && typeof value === "object";
}

function isRecord(value) {
  return isObject(value) && !Array.isArray(value);
}

function cloneJsonValue(value) {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

export function parseJsonInput(value, label) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new RenderValidationError(`${label} JSON is empty`);
    }
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      throw new RenderValidationError(`${label} JSON is invalid`, [
        error.message
      ]);
    }
  }

  if (isRecord(value) || Array.isArray(value)) {
    return value;
  }

  throw new RenderValidationError(`${label} JSON must be an object or JSON text`);
}

function validatePathKey(key, label) {
  if (!key) {
    throw new Error(`${label} contains an empty path segment`);
  }
  if (RESERVED_PATH_KEYS.has(key)) {
    throw new Error(`${label} uses a reserved path segment: ${key}`);
  }
}

function parsePath(pathExpression, label) {
  if (typeof pathExpression !== "string" || !pathExpression.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }

  const source = pathExpression.trim();
  const tokens = [];
  let buffer = "";

  const flushBuffer = () => {
    if (!buffer) return;
    validatePathKey(buffer, label);
    tokens.push(buffer);
    buffer = "";
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (char === ".") {
      if (!buffer && source[index - 1] !== "]") {
        throw new Error(`${label} has an empty segment near "${source}"`);
      }
      flushBuffer();
      continue;
    }

    if (char === "[") {
      flushBuffer();
      const closeIndex = source.indexOf("]", index);
      if (closeIndex === -1) {
        throw new Error(`${label} has an unclosed array index: ${source}`);
      }
      const rawIndex = source.slice(index + 1, closeIndex);
      if (!/^\d+$/.test(rawIndex)) {
        throw new Error(`${label} has an invalid array index: ${rawIndex}`);
      }
      tokens.push(Number(rawIndex));
      index = closeIndex;
      continue;
    }

    if (char === "]") {
      throw new Error(`${label} has an unexpected "]": ${source}`);
    }

    buffer += char;
  }

  flushBuffer();

  if (!tokens.length) {
    throw new Error(`${label} is empty`);
  }

  return tokens;
}

function getValueAtPath(root, pathExpression) {
  const tokens = parsePath(pathExpression, `content path "${pathExpression}"`);
  let current = root;
  const walked = [];

  for (const token of tokens) {
    walked.push(typeof token === "number" ? `[${token}]` : token);

    if (typeof token === "number") {
      if (!Array.isArray(current)) {
        throw new Error(
          `Path "${pathExpression}" expected an array at ${walked
            .slice(0, -1)
            .join(".") || "root"}`
        );
      }
      if (token >= current.length) {
        throw new Error(`Path "${pathExpression}" was not found in content`);
      }
      current = current[token];
      continue;
    }

    if (!isObject(current)) {
      throw new Error(`Path "${pathExpression}" cannot read "${token}"`);
    }
    if (!Object.prototype.hasOwnProperty.call(current, token)) {
      throw new Error(`Path "${pathExpression}" was not found in content`);
    }
    current = current[token];
  }

  return current;
}

function ensureAssignableContainer(value, slotExpression) {
  if (!isObject(value)) {
    throw new Error(`Slot "${slotExpression}" cannot be assigned`);
  }
}

function setValueAtPath(root, slotExpression, value) {
  const tokens = parsePath(slotExpression, `slot "${slotExpression}"`);
  let current = root;

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const token = tokens[index];
    const nextToken = tokens[index + 1];

    if (typeof token === "number") {
      if (!Array.isArray(current)) {
        throw new Error(`Slot "${slotExpression}" cannot write array index here`);
      }
      if (current[token] === undefined) {
        current[token] = typeof nextToken === "number" ? [] : {};
      }
      ensureAssignableContainer(current[token], slotExpression);
      current = current[token];
      continue;
    }

    ensureAssignableContainer(current, slotExpression);
    if (current[token] === undefined) {
      current[token] = typeof nextToken === "number" ? [] : {};
    } else {
      ensureAssignableContainer(current[token], slotExpression);
    }
    current = current[token];
  }

  const finalToken = tokens[tokens.length - 1];

  if (typeof finalToken === "number") {
    if (!Array.isArray(current)) {
      throw new Error(`Slot "${slotExpression}" cannot write array index here`);
    }
    if (current[finalToken] !== undefined) {
      throw new Error(`Slot "${slotExpression}" is assigned more than once`);
    }
    current[finalToken] = cloneJsonValue(value);
    return;
  }

  ensureAssignableContainer(current, slotExpression);
  if (Object.prototype.hasOwnProperty.call(current, finalToken)) {
    throw new Error(`Slot "${slotExpression}" is assigned more than once`);
  }
  current[finalToken] = cloneJsonValue(value);
}

function validateMapping(mapping) {
  if (!isRecord(mapping)) {
    throw new RenderValidationError("Mapping JSON must be an object");
  }
  if (!isRecord(mapping.slots)) {
    throw new RenderValidationError("Mapping JSON must include a slots object");
  }
}

function validateContent(content) {
  if (!isRecord(content)) {
    throw new RenderValidationError("Content JSON must be an object");
  }
}

function validateAnimationPreset(animationPreset) {
  if (!ANIMATION_PRESETS.includes(animationPreset)) {
    throw new RenderValidationError("Animation preset is invalid", [
      `Use one of: ${ANIMATION_PRESETS.join(", ")}`
    ]);
  }
}

export function resolveRenderProps(payload = {}) {
  const mapping = parseJsonInput(payload.mapping, "Mapping");
  const content = parseJsonInput(payload.content, "Content");

  validateMapping(mapping);
  validateContent(content);

  const templateId =
    typeof payload.templateId === "string" && payload.templateId.trim()
      ? payload.templateId.trim()
      : mapping.templateId;
  const animationPreset =
    typeof payload.animationPreset === "string" && payload.animationPreset.trim()
      ? payload.animationPreset.trim()
      : "clean-rise";

  if (!templateId || typeof templateId !== "string") {
    throw new RenderValidationError("templateId is required");
  }
  if (mapping.templateId && mapping.templateId !== templateId) {
    throw new RenderValidationError("templateId does not match mapping.templateId", [
      `Request templateId: ${templateId}`,
      `Mapping templateId: ${mapping.templateId}`
    ]);
  }

  validateAnimationPreset(animationPreset);

  const props = {
    templateId,
    format: mapping.format || "video",
    animationPreset
  };
  const details = [];

  for (const [slot, contentPath] of Object.entries(mapping.slots)) {
    if (typeof contentPath !== "string") {
      details.push(`Slot "${slot}" must point to a content path string`);
      continue;
    }

    try {
      const value = getValueAtPath(content, contentPath);
      setValueAtPath(props, slot, value);
    } catch (error) {
      details.push(error.message);
    }
  }

  if (details.length) {
    throw new RenderValidationError("Mapping could not be resolved", details);
  }

  return {
    templateId,
    animationPreset,
    mapping,
    content,
    props
  };
}

export const animationPresets = [...ANIMATION_PRESETS];
