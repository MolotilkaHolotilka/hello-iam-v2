import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PATHS } from "../lib/config.js";
import {
  ALLOWED_TEMPLATE_IDS,
  BUILTIN_TEMPLATE_IDS,
  getPublicTemplateLabel,
  shouldIncludeTemplateDir
} from "../lib/template-allowlist.js";
import { animationPresets } from "./props-resolver.js";
import {
  prepareWorkflowPayload,
  regenerateTemplateRegistry
} from "./template-workflow-service.js";
import {
  ensureTemplateAssetDirs,
  listTemplateAssets,
  migrateLegacyPathsForTemplate
} from "./template-assets-service.js";

const REMOTION_ROOT = path.join(PATHS.workspaceRoot, "apps", "helloiam-remotion");
const TEMPLATES_ROOT = path.join(REMOTION_ROOT, "src", "templates");
const REMOTION_CLI = path.join(
  REMOTION_ROOT,
  "node_modules",
  "@remotion",
  "cli",
  "remotion-cli.js"
);
const REMOTION_ENTRY = path.join(REMOTION_ROOT, "src", "index.ts");
const DEFAULT_COMPOSITION_ID = "TemplateRender";
const COMPOSITION_DURATIONS = {
  TemplateRender: 180,
  TemplateRenderPortrait: 630
};
const REMOTION_CONCURRENCY_DEFAULT = 6;
const PARALLEL_MAX_CAP = 6;
const REMOTION_PARALLEL_STILLS_DEFAULT = 4;
const REMOTION_PARALLEL_RENDERS_DEFAULT = 3;

function getParallelLimit(envKey, defaultValue) {
  const env = process.env[envKey];
  if (env !== undefined && env !== "") {
    const parsed = Number.parseInt(env, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.min(parsed, PARALLEL_MAX_CAP);
    }
  }

  return Math.min(defaultValue, PARALLEL_MAX_CAP);
}

function getParallelStills() {
  return getParallelLimit("REMOTION_PARALLEL_STILLS", REMOTION_PARALLEL_STILLS_DEFAULT);
}

function getParallelRenders() {
  return getParallelLimit("REMOTION_PARALLEL_RENDERS", REMOTION_PARALLEL_RENDERS_DEFAULT);
}

async function runInParallelPool(items, limit, worker) {
  if (items.length === 0) {
    return [];
  }

  let nextIndex = 0;
  const results = new Array(items.length);

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

function getRenderConcurrency() {
  const env = process.env.REMOTION_CONCURRENCY;
  if (env !== undefined && env !== "") {
    const parsed = Number.parseInt(env, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return REMOTION_CONCURRENCY_DEFAULT;
}

function withRenderConcurrency(args) {
  const concurrency = getRenderConcurrency();
  return [...args, "--concurrency", String(concurrency)];
}

class RenderExecutionError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "RenderExecutionError";
    this.code = "REMOTION_RENDER_FAILED";
    this.statusCode = 500;
    this.details = details;
  }
}

function toPublicRenderLink(runId, filename) {
  return `/content/artifacts/renders/${runId}/${filename}`;
}

async function readJsonFile(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readTemplateReadme(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    const heading = raw
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("# "));
    return {
      readme: raw,
      name: heading ? heading.replace(/^#\s+/, "") : null
    };
  } catch {
    return {
      readme: "",
      name: null
    };
  }
}

export async function listRenderTemplates() {
  await regenerateTemplateRegistry();

  if (!existsSync(TEMPLATES_ROOT)) {
    return {
      templates: [],
      animationPresets
    };
  }

  const entries = await readdir(TEMPLATES_ROOT, { withFileTypes: true });
  const templates = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!shouldIncludeTemplateDir(entry.name)) continue;

    const templateDir = path.join(TEMPLATES_ROOT, entry.name);
    const templateFile = path.join(templateDir, "template.tsx");
    const mappingFile = path.join(templateDir, "mapping.example.json");
    const contentFile = path.join(templateDir, "content.example.json");

    if (!existsSync(templateFile) || !existsSync(mappingFile) || !existsSync(contentFile)) {
      continue;
    }

    const [mappingExample, contentExample, readmeInfo] = await Promise.all([
      readJsonFile(mappingFile),
      readJsonFile(contentFile),
      readTemplateReadme(path.join(templateDir, "README.md"))
    ]);
    let workflow = {};
    try {
      workflow = await readJsonFile(path.join(templateDir, "workflow.json"));
    } catch {
      try {
        workflow = await readJsonFile(path.join(templateDir, "template.workflow.json"));
      } catch {
        workflow = {};
      }
    }

    await ensureTemplateAssetDirs(entry.name);
    await migrateLegacyPathsForTemplate(entry.name, contentExample);
    const assets = await listTemplateAssets(entry.name);

    templates.push({
      id: entry.name,
      name: getPublicTemplateLabel(entry.name) || readmeInfo.name || entry.name,
      format: mappingExample.format || "video",
      workflow,
      mappingExample,
      contentExample,
      readme: readmeInfo.readme,
      assetsRoot: assets.root,
      assetPaths: assets.paths
    });
  }

  const foundIds = new Set(templates.map((template) => template.id));
  for (const templateId of ALLOWED_TEMPLATE_IDS) {
    if (foundIds.has(templateId)) continue;

    templates.push({
      id: templateId,
      name: getPublicTemplateLabel(templateId) || templateId,
      format: "video",
      workflow: {},
      mappingExample: {},
      contentExample: { cards: [] },
      readme: "",
      assetsRoot: "",
      assetPaths: []
    });
  }

  templates.sort((a, b) => {
    const aBuiltin = BUILTIN_TEMPLATE_IDS.indexOf(a.id);
    const bBuiltin = BUILTIN_TEMPLATE_IDS.indexOf(b.id);
    if (aBuiltin >= 0 && bBuiltin >= 0) return aBuiltin - bBuiltin;
    if (aBuiltin >= 0) return -1;
    if (bBuiltin >= 0) return 1;
    return a.id.localeCompare(b.id);
  });

  return {
    templates,
    animationPresets
  };
}

function tail(value) {
  return value.slice(Math.max(0, value.length - 8000));
}

function runRemotion(args, phase) {
  if (!existsSync(REMOTION_CLI)) {
    throw new RenderExecutionError("Remotion CLI was not found", [
      `Expected: ${REMOTION_CLI}`,
      "Run npm install in apps/helloiam-remotion if dependencies are missing."
    ]);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [REMOTION_CLI, ...args], {
      cwd: REMOTION_ROOT,
      env: process.env,
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 1000 * 60 * 15);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(
        new RenderExecutionError(`Remotion ${phase} failed to start`, [
          error.message
        ])
      );
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({
          stdout,
          stderr
        });
        return;
      }

      reject(
        new RenderExecutionError(
          timedOut ? `Remotion ${phase} timed out` : `Remotion ${phase} failed`,
          [tail(stdout), tail(stderr)].filter(Boolean)
        )
      );
    });
  });
}

export async function resolvePropsForRender(payload) {
  return (await prepareWorkflowPayload(payload)).resolved;
}

export async function renderTemplate(payload) {
  const prepared = await prepareWorkflowPayload(payload);
  const resolved = prepared.resolved;
  const cardCount = prepared.workflow.cardCount || 1;
  const compositionId =
    typeof prepared.workflow.composition === "string" && prepared.workflow.composition.trim()
      ? prepared.workflow.composition.trim()
      : DEFAULT_COMPOSITION_ID;
  const durationPerCardFrames = Number(prepared.workflow.durationPerCardFrames);
  const compositionDuration =
    Number.isFinite(durationPerCardFrames) && durationPerCardFrames > 0 && cardCount > 0
      ? durationPerCardFrames * cardCount
      : COMPOSITION_DURATIONS[compositionId] || COMPOSITION_DURATIONS[DEFAULT_COMPOSITION_ID];
  const pngOnly = payload.pngOnly === true;
  const splitVideos =
    !pngOnly && prepared.workflow.splitVideos === true && cardCount > 1;
  const runId = `${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const renderDir = path.join(PATHS.contentRoot, "artifacts", "renders", runId);
  const propsPath = path.join(renderDir, "props.json");
  const pngPaths = Array.from({ length: cardCount }, (_item, index) =>
    path.join(renderDir, `card-${String(index + 1).padStart(2, "0")}.png`)
  );
  const pngPath = path.join(renderDir, "still.png");
  const mp4Path = path.join(renderDir, "video.mp4");
  const mp4PartPaths = splitVideos
    ? Array.from({ length: cardCount }, (_item, index) =>
        path.join(renderDir, `video-card-${String(index + 1).padStart(2, "0")}.mp4`)
      )
    : [];

  await mkdir(renderDir, { recursive: true });
  await writeFile(propsPath, `${JSON.stringify(resolved.props, null, 2)}\n`, "utf8");

  const segmentFrames = Math.max(1, Math.floor(compositionDuration / cardCount));
  const parallelStills = getParallelStills();
  const parallelRenders = getParallelRenders();
  console.log(
    `[remotion-render] parallel stills=${parallelStills} renders=${parallelRenders}`
  );

  await runInParallelPool(pngPaths, parallelStills, async (pngOutPath, index) => {
    const frame = Math.min(
      compositionDuration - 1,
      index * segmentFrames + Math.max(0, Math.min(30, segmentFrames - 1))
    );
    await runRemotion(
      [
        "still",
        REMOTION_ENTRY,
        compositionId,
        pngOutPath,
        "--props",
        propsPath,
        "--frame",
        String(frame)
      ],
      `PNG card ${index + 1} render`
    );
  });
  await writeFile(pngPath, await readFile(pngPaths[0]));

  if (!pngOnly) {
    const renderConcurrency = getRenderConcurrency();
    console.log(
      `[remotion-render] starting video render (concurrency=${renderConcurrency})`
    );
  }

  if (!pngOnly && splitVideos) {
    await runInParallelPool(
      Array.from({ length: cardCount }, (_item, index) => index),
      parallelRenders,
      async (index) => {
        const startFrame = index * segmentFrames;
        const endFrame = Math.min(
          compositionDuration - 1,
          (index + 1) * segmentFrames - 1
        );
        await runRemotion(
          withRenderConcurrency([
            "render",
            REMOTION_ENTRY,
            compositionId,
            mp4PartPaths[index],
            "--props",
            propsPath,
            "--frames",
            `${startFrame}-${endFrame}`
          ]),
          `MP4 card ${index + 1} render`
        );
      }
    );
    await writeFile(mp4Path, await readFile(mp4PartPaths[0]));
  } else if (!pngOnly) {
    await runRemotion(
      withRenderConcurrency([
        "render",
        REMOTION_ENTRY,
        compositionId,
        mp4Path,
        "--props",
        propsPath
      ]),
      "MP4 render"
    );
  }

  return {
    ok: true,
    runId,
    props: resolved.props,
    workflow: {
      cardCount,
      composition: compositionId,
      splitVideos
    },
    files: {
      png: pngPath,
      pngs: pngPaths,
      mp4: mp4Path,
      mp4s: mp4PartPaths,
      props: propsPath
    },
    links: {
      png: toPublicRenderLink(runId, "still.png"),
      pngs: pngPaths.map((_png, index) =>
        toPublicRenderLink(runId, `card-${String(index + 1).padStart(2, "0")}.png`)
      ),
      mp4: toPublicRenderLink(runId, "video.mp4"),
      mp4s: mp4PartPaths.map((_mp4, index) =>
        toPublicRenderLink(runId, `video-card-${String(index + 1).padStart(2, "0")}.mp4`)
      ),
      props: toPublicRenderLink(runId, "props.json")
    }
  };
}
