import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PATHS } from "./config.js";

const STORE_DIR = path.join(PATHS.appRoot, "data");
const STORE_FILE = path.join(STORE_DIR, "css-import-allowlist.json");

function readStoreFile() {
  if (!existsSync(STORE_FILE)) {
    return [];
  }
  try {
    const data = JSON.parse(readFileSync(STORE_FILE, "utf8"));
    return Array.isArray(data.templateIds) ? data.templateIds : [];
  } catch {
    return [];
  }
}

let runtimeTemplateIds = new Set(readStoreFile());

export function reloadRuntimeTemplateIds() {
  runtimeTemplateIds = new Set(readStoreFile());
}

export function getRuntimeTemplateIds() {
  return [...runtimeTemplateIds];
}

export function hasRuntimeTemplateId(templateId) {
  return runtimeTemplateIds.has(templateId);
}

export async function persistRuntimeTemplateId(templateId) {
  if (!templateId || runtimeTemplateIds.has(templateId)) {
    return;
  }

  runtimeTemplateIds.add(templateId);
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(
    STORE_FILE,
    `${JSON.stringify({ templateIds: [...runtimeTemplateIds] }, null, 2)}\n`,
    "utf8"
  );
}
