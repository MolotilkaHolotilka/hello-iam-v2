import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PATHS } from "../lib/config.js";
import {
  ALLOWED_TEMPLATE_IDS,
  isPublicTemplateId,
  shouldIncludeTemplateDir
} from "../lib/template-allowlist.js";
import {
  parseJsonInput,
  RenderValidationError,
  resolveRenderProps
} from "./props-resolver.js";
import { persistRuntimeTemplateId } from "../lib/css-import-allowlist-store.js";
import { stripEmptyAssetRefs } from "./content-template-service.js";
import {
  ensureTemplateAssetDirs,
  migrateLegacyPathsForTemplate,
  validateTemplateScopedAssets
} from "./template-assets-service.js";

const REMOTION_ROOT = path.join(PATHS.workspaceRoot, "apps", "helloiam-remotion");
const TEMPLATES_ROOT = path.join(REMOTION_ROOT, "src", "templates");
const REGISTRY_FILE = path.join(TEMPLATES_ROOT, "registry.ts");
const REMOTION_PUBLIC = path.join(REMOTION_ROOT, "public");

const DEFAULT_MAPPING = {
  templateId: "custom-jsx-template",
  format: "carousel",
  slots: {
    "cover.title": "slides[0].title",
    "cover.subtitle": "slides[0].subtitle",
    "cover.image": "slides[0].image",
    "fact1.title": "slides[1].title",
    "fact1.text": "slides[1].text",
    "fact1.image": "slides[1].image"
  }
};

const DEFAULT_CONTENT = {
  item: "custom-item",
  slides: [
    {
      title: "HELLO, I AM CUSTOM",
      subtitle: "A reusable Remotion workflow from JSX",
      image: "templates/custom-jsx-template/images/lavash.jpg"
    },
    {
      title: "SECOND SLIDE",
      text: "Replace this copy and image with your real content.",
      image: "templates/custom-jsx-template/images/lavash-oven.jpg"
    }
  ]
};

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function validateTemplateId(templateId) {
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(templateId)) {
    throw new RenderValidationError("Template id is invalid", [
      "Use 2-64 chars: lowercase letters, numbers, and hyphens."
    ]);
  }
  if (!isPublicTemplateId(templateId)) {
    throw new RenderValidationError("Template is not allowed", [
      `Allowed templates: ${ALLOWED_TEMPLATE_IDS.join(", ")}`
    ]);
  }
}

function parseOptionalJson(value, label, fallback) {
  if (typeof value === "string" && !value.trim()) {
    return fallback;
  }
  if (value === undefined || value === null) {
    return fallback;
  }
  return parseJsonInput(value, label);
}

function parseWorkflowInput(value, templateId, templateName) {
  const workflow = parseOptionalJson(value, "Workflow", {});
  const cardCount = Number(workflow.cardCount || 0);
  return {
    ...workflow,
    templateId,
    name: workflow.name || templateName || templateId,
    cardCount: Number.isInteger(cardCount) && cardCount > 0 ? cardCount : undefined
  };
}

function inferCardCount(mapping, content, workflow = {}) {
  if (Number.isInteger(workflow.cardCount) && workflow.cardCount > 0) {
    return workflow.cardCount;
  }

  const indexes = new Set();
  for (const slot of Object.keys(mapping?.slots || {})) {
    const topLevel = slot.split(/[.[\]]/).filter(Boolean)[0] || "";
    const cardMatch = topLevel.match(/^card(\d+)$/i);
    const factMatch = topLevel.match(/^fact(\d+)$/i);
    const slideMatch = topLevel.match(/^slide(\d+)$/i);

    if (topLevel === "cover") indexes.add(1);
    if (cardMatch) indexes.add(Number(cardMatch[1]));
    if (factMatch) indexes.add(Number(factMatch[1]) + 1);
    if (slideMatch) indexes.add(Number(slideMatch[1]));
  }

  if (indexes.size) {
    return Math.max(...indexes);
  }

  if (Array.isArray(content?.cards)) return content.cards.length;
  if (Array.isArray(content?.slides)) return content.slides.length;

  return 1;
}

function validateCardCount(content, cardCount) {
  if (Array.isArray(content?.cards) && content.cards.length !== cardCount) {
    throw new RenderValidationError("Content card count does not match workflow", [
      `workflow.cardCount: ${cardCount}`,
      `content.cards.length: ${content.cards.length}`
    ]);
  }

  if (Array.isArray(content?.slides) && content.slides.length !== cardCount) {
    throw new RenderValidationError("Content slide count does not match workflow", [
      `workflow.cardCount: ${cardCount}`,
      `content.slides.length: ${content.slides.length}`
    ]);
  }
}


export async function prepareWorkflowPayload(payload = {}) {
  await regenerateTemplateRegistry();

  const templateName = String(payload.templateName || payload.name || "").trim();
  const templateId = slugify(payload.templateId || templateName);
  const exportName = String(payload.exportName || "").trim();

  validateTemplateId(templateId);

  const mapping = parseOptionalJson(payload.mapping, "Mapping", DEFAULT_MAPPING);
  const content = parseOptionalJson(payload.content, "Content", DEFAULT_CONTENT);
  mapping.templateId = templateId;

  const workflow = parseWorkflowInput(payload.workflow, templateId, templateName);
  workflow.cardCount = inferCardCount(mapping, content, workflow);
  validateCardCount(content, workflow.cardCount);

  const resolved = resolveRenderProps({
    templateId,
    mapping,
    content,
    animationPreset: payload.animationPreset || "clean-rise"
  });
  resolved.props.workflow = {
    ...(resolved.props.workflow || {}),
    cardCount: workflow.cardCount,
    durationPerCardFrames: workflow.durationPerCardFrames,
    fps: workflow.fps
  };
  await ensureTemplateAssetDirs(templateId);
  const propsForValidation = stripEmptyAssetRefs(resolved.props);
  validateTemplateScopedAssets(templateId, propsForValidation);

  return {
    templateId,
    templateName,
    exportName,
    mapping,
    content,
    workflow,
    resolved
  };
}

function normalizeTemplateSource(source) {
  const trimmed = String(source || "").trim();

  if (!trimmed) {
    throw new RenderValidationError("JSX source is required");
  }

  if (trimmed.startsWith("<")) {
    return [
      "import type React from 'react';",
      "import {AbsoluteFill} from 'remotion';",
      "import type {TemplateRenderProps} from '../types';",
      "",
      "export const Template: React.FC<TemplateRenderProps> = (props) => (",
      "  <AbsoluteFill style={{backgroundColor: '#fff7e8', color: '#21170f'}}> ",
      trimmed,
      "  </AbsoluteFill>",
      ");",
      ""
    ].join("\n");
  }

  if (!/\bexport\s+/.test(trimmed)) {
    throw new RenderValidationError("JSX source must export a component", [
      "Use export default, export const Template, or paste raw JSX starting with <."
    ]);
  }

  return `${trimmed}\n`;
}

async function readTemplateMeta(templateDir) {
  try {
    const raw = await readFile(path.join(templateDir, "workflow.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    try {
      const raw = await readFile(path.join(templateDir, "template.workflow.json"), "utf8");
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
}

async function listTemplateModuleDirs() {
  if (!existsSync(TEMPLATES_ROOT)) return [];

  const entries = await readdir(TEMPLATES_ROOT, { withFileTypes: true });
  const dirs = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!shouldIncludeTemplateDir(entry.name)) continue;

    const templateDir = path.join(TEMPLATES_ROOT, entry.name);
    if (!existsSync(path.join(templateDir, "template.tsx"))) continue;

    const meta = await readTemplateMeta(templateDir);
    dirs.push({
      id: entry.name,
      exportName: typeof meta.exportName === "string" ? meta.exportName : ""
    });
  }

  return dirs.sort((a, b) => a.id.localeCompare(b.id));
}

export async function regenerateTemplateRegistry() {
  const dirs = await listTemplateModuleDirs();
  const imports = dirs
    .map((template, index) => `import * as template${index} from './${template.id}/template';`)
    .join("\n");
  const entries = dirs
    .map((template, index) => {
      const exportArg = template.exportName
        ? `, ${JSON.stringify(template.exportName)}`
        : "";
      return `  ${JSON.stringify(template.id)}: pickTemplate(template${index}, ${JSON.stringify(
        template.id
      )}${exportArg}),`;
    })
    .join("\n");

  const source = [
    "import type {TemplateComponent} from './types';",
    imports,
    "",
    "type TemplateModule = Record<string, unknown> & {",
    "  default?: TemplateComponent;",
    "  Template?: TemplateComponent;",
    "};",
    "",
    "const pickTemplate = (",
    "  module: TemplateModule,",
    "  templateId: string,",
    "  exportName?: string,",
    "): TemplateComponent => {",
    "  const namedExport = exportName ? module[exportName] : undefined;",
    "  const component = namedExport ?? module.Template ?? module.default;",
    "",
    "  if (typeof component !== 'function') {",
    "    throw new Error(`Template \"${templateId}\" does not export a component`);",
    "  }",
    "",
    "  return component as TemplateComponent;",
    "};",
    "",
    "export const templateRegistry: Record<string, TemplateComponent> = {",
    entries,
    "};",
    ""
  ].join("\n");

  await writeFile(REGISTRY_FILE, source, "utf8");
}

function humanTemplateName(templateId) {
  return String(templateId || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildGreenPlateMapping(templateId, cardCount) {
  const slots = {};
  const helloFields = [
    "title",
    "titleAccent",
    "label",
    "image",
    "background",
    "titleColor",
    "accentColor",
    "labelColor",
    "introLayout"
  ];
  const quoteFields = [
    "title",
    "titleAccent",
    "image",
    "quote",
    "label",
    "background",
    "quoteColor",
    "accentColor",
    "titleColor",
    "labelColor"
  ];
  const brandFields = ["brandLeft", "brandRight", "image", "background", "brandColor"];
  const count = Math.max(1, Number(cardCount) || 1);

  for (const field of helloFields) {
    slots[`card1.${field}`] = `cards[0].${field}`;
  }

  for (let cardNum = 2; cardNum <= count - 1; cardNum += 1) {
    const cardIndex = cardNum - 1;
    for (const field of quoteFields) {
      slots[`card${cardNum}.${field}`] = `cards[${cardIndex}].${field}`;
    }
  }

  if (count >= 2) {
    const brandNum = count;
    const brandIndex = count - 1;
    for (const field of brandFields) {
      slots[`card${brandNum}.${field}`] = `cards[${brandIndex}].${field}`;
    }
  }

  return {
    templateId,
    format: "carousel-portrait",
    slots
  };
}

function buildCssImportWorkflow(templateId, cardCount, templateName) {
  return {
    id: templateId,
    templateId,
    name: templateName || humanTemplateName(templateId),
    format: "carousel-portrait",
    cardCount,
    width: 1080,
    height: 1350,
    fps: 30,
    durationPerCardFrames: 90,
    composition: "TemplateRenderPortrait",
    splitVideos: true,
    exportName: "Template"
  };
}

/**
 * Scaffold a green-plate re-export template from CSS import output.
 *
 * @param {{ templateId: string, content: object, baseTemplateId?: string }} payload
 */
export async function createTemplateFromCssImport(payload = {}) {
  const templateId = slugify(payload.templateId);
  if (!templateId) {
    throw new RenderValidationError("Template id is required");
  }

  const content = parseOptionalJson(payload.content, "Content", { cards: [] });
  const cardCount = Array.isArray(content.cards) ? Math.max(content.cards.length, 1) : 1;
  const templateName = payload.templateName || humanTemplateName(templateId);
  const baseTemplateId = payload.baseTemplateId || "green-plate-intro";

  const templateDir = path.join(TEMPLATES_ROOT, templateId);
  if (existsSync(templateDir)) {
    throw new RenderValidationError("Template already exists", [
      `Choose another id or remove the existing folder: ${templateId}`
    ]);
  }

  const mapping = buildGreenPlateMapping(templateId, cardCount);
  const workflow = buildCssImportWorkflow(templateId, cardCount, templateName);
  const templateSource = `export {GreenPlateIntroTemplate as Template} from '../${baseTemplateId}/template';\n`;

  await mkdir(templateDir, { recursive: true });
  await ensureTemplateAssetDirs(templateId);
  await persistRuntimeTemplateId(templateId);
  await writeFile(path.join(templateDir, "template.tsx"), templateSource, "utf8");
  await writeFile(
    path.join(templateDir, "mapping.example.json"),
    `${JSON.stringify(mapping, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(templateDir, "content.example.json"),
    `${JSON.stringify(content, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(templateDir, "workflow.json"),
    `${JSON.stringify(workflow, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(templateDir, "README.md"),
    [
      `# ${templateName}`,
      "",
      "Imported from CSS via post-ops-ui Import page.",
      `Base layout: \`${baseTemplateId}\`.`,
      ""
    ].join("\n"),
    "utf8"
  );

  await regenerateTemplateRegistry();

  return {
    ok: true,
    template: {
      id: templateId,
      name: templateName,
      format: mapping.format,
      workflow,
      mappingExample: mapping,
      contentExample: content
    }
  };
}

export async function createTemplateWorkflowFromJsx(payload = {}) {
  const { templateId, templateName, exportName, mapping, content, workflow } =
    await prepareWorkflowPayload(payload);

  const templateDir = path.join(TEMPLATES_ROOT, templateId);
  if (existsSync(templateDir)) {
    throw new RenderValidationError("Template already exists", [
      `Choose another id or remove the existing folder: ${templateId}`
    ]);
  }

  await mkdir(templateDir, { recursive: true });
  await ensureTemplateAssetDirs(templateId);
  await writeFile(path.join(templateDir, "template.tsx"), normalizeTemplateSource(payload.jsx), "utf8");
  await writeFile(
    path.join(templateDir, "mapping.example.json"),
    `${JSON.stringify(mapping, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(templateDir, "content.example.json"),
    `${JSON.stringify(content, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(templateDir, "template.workflow.json"),
    `${JSON.stringify({ ...workflow, id: templateId, exportName }, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(templateDir, "workflow.json"),
    `${JSON.stringify({ ...workflow, id: templateId, exportName }, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(templateDir, "README.md"),
    [`# ${templateName || templateId}`, "", "Imported from JSX in the local MVP UI.", ""].join("\n"),
    "utf8"
  );

  await regenerateTemplateRegistry();

  return {
    ok: true,
    template: {
      id: templateId,
      name: templateName || templateId,
      format: mapping.format || "video",
      mappingExample: mapping,
      contentExample: content
    }
  };
}
