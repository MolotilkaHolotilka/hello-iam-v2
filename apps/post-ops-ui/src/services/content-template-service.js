import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PATHS } from "../lib/config.js";
import { isPublicTemplateId } from "../lib/template-allowlist.js";
import { RenderValidationError, parseJsonInput } from "./props-resolver.js";
import {
  listTemplateAssets,
  validateTemplateScopedAssets
} from "./template-assets-service.js";

const TEMPLATES_ROOT = path.join(
  PATHS.workspaceRoot,
  "apps",
  "helloiam-remotion",
  "src",
  "templates"
);

function validateTemplateId(templateId) {
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(templateId || "")) {
    throw new RenderValidationError("Template id is invalid", [
      "Use lowercase letters, numbers, and hyphens."
    ]);
  }
  if (!isPublicTemplateId(templateId)) {
    throw new RenderValidationError("Template is not allowed");
  }
}

function resolveTemplateFile(templateId, fileName) {
  validateTemplateId(templateId);

  const root = path.resolve(TEMPLATES_ROOT);
  const filePath = path.resolve(root, templateId, fileName);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    throw new RenderValidationError("Template path is invalid");
  }
  return filePath;
}

async function readJsonFile(filePath, label) {
  if (!existsSync(filePath)) {
    const error = new RenderValidationError(`${label} not found`);
    error.statusCode = 404;
    throw error;
  }
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new RenderValidationError(`${label} is invalid`, [error.message]);
  }
}

async function readWorkflow(templateId) {
  const workflowFile = resolveTemplateFile(templateId, "workflow.json");
  const legacyWorkflowFile = resolveTemplateFile(templateId, "template.workflow.json");
  if (existsSync(workflowFile)) {
    return readJsonFile(workflowFile, "Workflow JSON");
  }
  if (existsSync(legacyWorkflowFile)) {
    return readJsonFile(legacyWorkflowFile, "Workflow JSON");
  }
  return {};
}

function validateContentForSave(content) {
  const parsed = parseJsonInput(content, "Content");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new RenderValidationError("Content JSON must be an object");
  }
  if (!Array.isArray(parsed.cards)) {
    throw new RenderValidationError('Content JSON must include a "cards" array');
  }
  return parsed;
}

export function stripEmptyAssetRefs(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stripEmptyAssetRefs(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const clone = {};
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === "string" && !child.trim() && /(image|backgroundimage)$/i.test(key)) {
      clone[key] = null;
      continue;
    }
    clone[key] = stripEmptyAssetRefs(child);
  }
  return clone;
}

export async function getTemplateContentPayload(templateId) {
  const [content, mappingExample, workflow, assets] = await Promise.all([
    readJsonFile(resolveTemplateFile(templateId, "content.example.json"), "Content JSON"),
    readJsonFile(resolveTemplateFile(templateId, "mapping.example.json"), "Mapping JSON"),
    readWorkflow(templateId),
    listTemplateAssets(templateId)
  ]);

  return {
    templateId,
    content,
    mappingExample,
    workflow,
    assetsRoot: assets.root,
    assetPaths: assets.paths
  };
}

export async function updateTemplateContent(templateId, content) {
  const parsed = validateContentForSave(content);
  const filePath = resolveTemplateFile(templateId, "content.example.json");
  if (!existsSync(filePath)) {
    const error = new RenderValidationError("Content JSON not found");
    error.statusCode = 404;
    throw error;
  }

  validateTemplateScopedAssets(templateId, stripEmptyAssetRefs(parsed));
  await writeFile(filePath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  return getTemplateContentPayload(templateId);
}
