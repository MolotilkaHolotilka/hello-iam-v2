import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { PATHS } from "../lib/config.js";
import { ensureDir } from "../lib/fs-utils.js";

function resolveContentPath(relativePath) {
  return path.join(PATHS.contentRoot, relativePath);
}

function resolveLegacyPath(relativePath) {
  return path.join(PATHS.workspaceRoot, relativePath);
}

function resolveReadPath(relativePath) {
  const contentPath = resolveContentPath(relativePath);
  if (existsSync(contentPath)) {
    return contentPath;
  }
  return resolveLegacyPath(relativePath);
}

export async function readTextFile(relativePath) {
  if (!relativePath) return null;
  try {
    const absPath = resolveReadPath(relativePath);
    return await fs.readFile(absPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function writeTextFile(relativePath, content) {
  const absPath = resolveContentPath(relativePath);
  await ensureDir(path.dirname(absPath));
  await fs.writeFile(absPath, content, "utf8");
  return relativePath;
}

export async function readPostBundle(post) {
  const [postContent, storyboardContent, storyPackContent, manifestContent] =
    await Promise.all([
      readTextFile(post.paths.post),
      readTextFile(post.paths.storyboard),
      readTextFile(post.paths.storyPack),
      readTextFile(post.paths.manifest)
    ]);

  return {
    post: postContent,
    storyboard: storyboardContent,
    storyPack: storyPackContent,
    manifest: manifestContent
  };
}
