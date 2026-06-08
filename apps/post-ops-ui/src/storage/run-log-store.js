import fs from "node:fs/promises";
import path from "node:path";
import { PATHS } from "../lib/config.js";
import { ensureDir, listFiles, readJson, writeJson } from "../lib/fs-utils.js";

export async function appendRun(postId, runPayload) {
  const postRunDir = path.join(PATHS.runsDir, postId);
  await ensureDir(postRunDir);
  const filePath = path.join(postRunDir, `${runPayload.runId}.json`);
  await writeJson(filePath, runPayload);
  return path.relative(PATHS.root, filePath);
}

export async function listRuns(postId) {
  const postRunDir = path.join(PATHS.runsDir, postId);
  const runFiles = await listFiles(postRunDir, ".json");
  const runs = [];
  for (const runFile of runFiles) {
    const payload = await readJson(runFile, null);
    if (payload) runs.push(payload);
  }
  runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return runs;
}

export async function getLatestRun(postId) {
  const runs = await listRuns(postId);
  return runs[0] || null;
}

export async function listArtifacts(postId) {
  const dir = path.join(PATHS.artifactsDir, postId);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => path.join("artifacts", postId, entry.name));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
