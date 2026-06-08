import { createReadStream, existsSync } from "node:fs";
import { copyFile, mkdir, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { PATHS } from "../lib/config.js";
import { RenderValidationError } from "./props-resolver.js";

const REMOTION_PUBLIC = path.join(
  PATHS.workspaceRoot,
  "apps",
  "helloiam-remotion",
  "public"
);
const TEMPLATES_PUBLIC_ROOT = path.join(REMOTION_PUBLIC, "templates");
const LEGACY_GENERATED = path.join(REMOTION_PUBLIC, "generated");

const ASSET_BUCKETS = ["images", "stickers"];
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;

export function getTemplateAssetsRoot(templateId) {
  return path.join(TEMPLATES_PUBLIC_ROOT, templateId);
}

export function getTemplateBucketDir(templateId, bucket) {
  if (!ASSET_BUCKETS.includes(bucket)) {
    throw new Error(`Unknown asset bucket: ${bucket}`);
  }
  return path.join(getTemplateAssetsRoot(templateId), bucket);
}

export function buildTemplateAssetPath(templateId, bucket, fileName) {
  return `templates/${templateId}/${bucket}/${fileName}`;
}

export function sanitizeAssetFileName(fileName) {
  const base = path.basename(String(fileName || "").trim());
  const safe = base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!safe || safe === "." || safe === "..") {
    throw new Error("Invalid file name");
  }
  return safe;
}

function isRemoteOrDataAsset(value) {
  return /^(https?:|data:|file:)/i.test(value);
}

export function isTemplateScopedAssetPath(templateId, assetPath) {
  if (!assetPath || typeof assetPath !== "string") return false;
  if (isRemoteOrDataAsset(assetPath)) return false;

  const normalized = assetPath.replace(/^public[\\/]/, "").replace(/^\/+/, "");

  if (normalized.startsWith("posts/")) {
    const rest = normalized.slice("posts/".length);
    const slashIdx = rest.indexOf("/");
    if (slashIdx <= 0) return false;
    const postSegment = rest.slice(0, slashIdx);
    return /^[A-Za-z0-9_-]+$/.test(postSegment) && rest.length > slashIdx + 1;
  }

  const prefix = `templates/${templateId}/`;
  if (!normalized.startsWith(prefix)) return false;

  const rest = normalized.slice(prefix.length);
  return rest.startsWith("images/") || rest.startsWith("stickers/");
}

export function resolveTemplateAssetAbsolutePath(assetPath) {
  const normalized = assetPath.replace(/^public[\\/]/, "").replace(/^\/+/, "");
  return path.join(REMOTION_PUBLIC, normalized);
}

export function templateAssetExists(templateId, assetPath) {
  if (!isTemplateScopedAssetPath(templateId, assetPath)) return false;
  return existsSync(resolveTemplateAssetAbsolutePath(assetPath));
}

export async function ensureTemplateAssetDirs(templateId) {
  await mkdir(getTemplateBucketDir(templateId, "images"), { recursive: true });
  await mkdir(getTemplateBucketDir(templateId, "stickers"), { recursive: true });
}

async function listBucketFiles(templateId, bucket) {
  const dir = getTemplateBucketDir(templateId, bucket);
  if (!existsSync(dir)) return [];

  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (!entry.isFile() || !IMAGE_EXT.test(entry.name)) continue;
    const absolutePath = path.join(dir, entry.name);
    const fileStat = await stat(absolutePath);
    files.push({
      name: entry.name,
      bucket,
      path: buildTemplateAssetPath(templateId, bucket, entry.name),
      size: fileStat.size,
      updatedAt: fileStat.mtime.toISOString()
    });
  }

  return files.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listTemplateAssets(templateId) {
  await ensureTemplateAssetDirs(templateId);
  const [images, stickers] = await Promise.all([
    listBucketFiles(templateId, "images"),
    listBucketFiles(templateId, "stickers")
  ]);

  return {
    templateId,
    root: `templates/${templateId}`,
    images,
    stickers,
    paths: [...images, ...stickers].map((file) => file.path)
  };
}

export async function deleteTemplateAsset(templateId, bucket, fileName) {
  const safeName = sanitizeAssetFileName(fileName);
  const absolutePath = path.join(getTemplateBucketDir(templateId, bucket), safeName);
  if (!existsSync(absolutePath)) {
    throw new Error("Asset not found");
  }
  await unlink(absolutePath);
  return {
    deleted: buildTemplateAssetPath(templateId, bucket, safeName)
  };
}

function collectAssetRefs(value, refs = [], parentKey = "") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectAssetRefs(item, refs, `${parentKey}[${index}]`));
    return refs;
  }

  if (!value || typeof value !== "object") {
    return refs;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = parentKey ? `${parentKey}.${key}` : key;

    if (
      typeof child === "string" &&
      (/(image|video|media|asset|src|url|backgroundimage)$/i.test(key) ||
        /\.(png|jpe?g|webp|gif|svg|mp4|webm|mov)$/i.test(child))
    ) {
      refs.push({ field: childPath, path: child });
      continue;
    }

    collectAssetRefs(child, refs, childPath);
  }

  return refs;
}

export function validateTemplateScopedAssets(templateId, props) {
  const invalid = [];
  const missing = [];

  for (const asset of collectAssetRefs(props)) {
    if (isRemoteOrDataAsset(asset.path)) {
      invalid.push(`${asset.field}: remote URLs are not allowed (${asset.path})`);
      continue;
    }
    if (!isTemplateScopedAssetPath(templateId, asset.path)) {
      invalid.push(
        `${asset.field}: must start with templates/${templateId}/images/, templates/${templateId}/stickers/, or posts/<postId>/ (${asset.path})`
      );
      continue;
    }
    if (!templateAssetExists(templateId, asset.path)) {
      missing.push(`${asset.field}: ${asset.path}`);
    }
  }

  if (invalid.length) {
    throw new RenderValidationError("Asset paths must use the selected template folder only", invalid);
  }
  if (missing.length) {
    throw new RenderValidationError("Some template assets were not found", missing);
  }
}

async function copyIfMissing(sourcePath, destPath) {
  if (!existsSync(sourcePath) || existsSync(destPath)) return false;
  await mkdir(path.dirname(destPath), { recursive: true });
  await copyFile(sourcePath, destPath);
  return true;
}

function legacySourcePath(legacyPath) {
  const normalized = legacyPath.replace(/^public[\\/]/, "").replace(/^\/+/, "");
  return path.join(REMOTION_PUBLIC, normalized);
}

function pickBucketFromLegacyPath(legacyPath) {
  const normalized = legacyPath.replace(/^\/+/, "");
  if (/emoji/i.test(normalized) || /_emoji\./i.test(normalized) || /\/stickers\//i.test(normalized)) {
    return "stickers";
  }
  return "images";
}

export async function migrateLegacyPathsForTemplate(templateId, contentExample) {
  await ensureTemplateAssetDirs(templateId);
  const refs = collectAssetRefs(contentExample);
  let copied = 0;

  for (const ref of refs) {
    if (isRemoteOrDataAsset(ref.path)) continue;
    if (isTemplateScopedAssetPath(templateId, ref.path)) continue;
    if (!ref.path.startsWith("generated/")) continue;

    const bucket = pickBucketFromLegacyPath(ref.path);
    const fileName = path.basename(ref.path);
    const source = legacySourcePath(ref.path);
    const dest = path.join(getTemplateBucketDir(templateId, bucket), fileName);
    if (await copyIfMissing(source, dest)) copied += 1;
  }

  return copied;
}

export function rewriteContentToTemplatePaths(templateId, content) {
  const clone = structuredClone(content);

  for (const ref of collectAssetRefs(clone)) {
    if (!ref.path.startsWith("generated/")) continue;
    const bucket = pickBucketFromLegacyPath(ref.path);
    const fileName = path.basename(ref.path);
    const nextPath = buildTemplateAssetPath(templateId, bucket, fileName);

    const setAtPath = (root, fieldPath, value) => {
      const parts = fieldPath.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
      let cursor = root;
      for (let i = 0; i < parts.length - 1; i += 1) {
        cursor = cursor[parts[i]];
      }
      cursor[parts[parts.length - 1]] = value;
    };

    setAtPath(clone, ref.field, nextPath);
  }

  return clone;
}

export { createReadStream, REMOTION_PUBLIC, TEMPLATES_PUBLIC_ROOT, LEGACY_GENERATED };
