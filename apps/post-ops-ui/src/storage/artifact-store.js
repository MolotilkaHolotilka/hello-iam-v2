import path from "node:path";
import { PATHS } from "../lib/config.js";
import { ensureDir } from "../lib/fs-utils.js";
import { sha256 } from "../lib/hash.js";
import { writeTextFile } from "./content-repo.js";

function artifactExtension(type) {
  if (type === "manifest") return "json";
  return "md";
}

export async function writeArtifact(postId, runId, type, content) {
  const ext = artifactExtension(type);
  const fileName = `${runId}.${type}.${ext}`;
  const relativePath = path.join("artifacts", postId, fileName);
  await ensureDir(path.join(PATHS.artifactsDir, postId));
  await writeTextFile(relativePath, content);

  return {
    type,
    path: relativePath,
    version: runId,
    checksum: sha256(content)
  };
}
