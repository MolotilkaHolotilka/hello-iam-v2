import archiver from "archiver";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { PATHS } from "../lib/config.js";

const RENDERS_ROOT = path.join(PATHS.contentRoot, "artifacts", "renders");

const DOWNLOAD_MODES = {
  images: {
    suffix: "images",
    extensions: new Set([".png"])
  },
  video: {
    suffix: "video",
    extensions: new Set([".mp4"])
  },
  all: {
    suffix: "all",
    extensions: new Set([".png", ".mp4"])
  }
};

function isInsideRendersRoot(candidatePath) {
  const normalized = path.resolve(candidatePath);
  const root = path.resolve(RENDERS_ROOT);
  return normalized === root || normalized.startsWith(`${root}${path.sep}`);
}

export function resolveRenderRunDir(runIdOrPath) {
  if (!runIdOrPath || typeof runIdOrPath !== "string") {
    return null;
  }

  const trimmed = runIdOrPath.trim();
  if (!trimmed || trimmed.includes("..")) {
    return null;
  }

  if (path.isAbsolute(trimmed)) {
    const normalized = path.normalize(trimmed);
    return isInsideRendersRoot(normalized) ? normalized : null;
  }

  if (trimmed.includes("/") || trimmed.includes("\\")) {
    const resolved = path.resolve(PATHS.workspaceRoot, trimmed);
    return isInsideRendersRoot(resolved) ? resolved : null;
  }

  return path.join(RENDERS_ROOT, trimmed);
}

export function renderRunExists(runIdOrPath) {
  const runDir = resolveRenderRunDir(runIdOrPath);
  return Boolean(runDir && existsSync(runDir));
}

function matchesMode(fileName, mode) {
  const extension = path.extname(fileName).toLowerCase();
  return DOWNLOAD_MODES[mode].extensions.has(extension);
}

export async function collectRenderFiles(runDir, mode) {
  if (!DOWNLOAD_MODES[mode]) {
    throw new Error(`Unknown download mode: ${mode}`);
  }

  const entries = await readdir(runDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && matchesMode(entry.name, mode))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      absolutePath: path.join(runDir, name),
      archiveName: name
    }));
}

export function getDownloadFilename(runId, mode) {
  const safeRunId = path.basename(runId);
  return `${safeRunId}-${DOWNLOAD_MODES[mode].suffix}.zip`;
}

export function createRenderZipStream(runDir, mode) {
  if (!DOWNLOAD_MODES[mode]) {
    throw new Error(`Unknown download mode: ${mode}`);
  }

  const archive = archiver("zip", {
    zlib: { level: 9 }
  });

  return {
    archive,
    async appendFiles() {
      const files = await collectRenderFiles(runDir, mode);
      for (const file of files) {
        archive.file(file.absolutePath, { name: file.archiveName });
      }
      return files;
    }
  };
}
