import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fal } from "@fal-ai/client";
import { PATHS } from "../lib/config.js";
import { sha256 } from "../lib/hash.js";
import { ensureDir } from "../lib/fs-utils.js";
import { getPost } from "../storage/index-store.js";
import { appendRun } from "../storage/run-log-store.js";
import { writeArtifact } from "../storage/artifact-store.js";

function nowIso() {
  return new Date().toISOString();
}

function createRunId() {
  return `${Date.now()}-${randomUUID().slice(0, 8)}`;
}

function getFalModel(model) {
  return (model || process.env.FAL_MODEL || "fal-ai/flux/schnell").trim();
}

function getImageUrl(result) {
  const images = result?.data?.images;
  if (Array.isArray(images) && images[0]?.url) {
    return images[0].url;
  }
  if (result?.data?.image?.url) {
    return result.data.image.url;
  }
  if (typeof result?.data?.url === "string") {
    return result.data.url;
  }
  return null;
}

function extensionFromContentType(contentType) {
  if (!contentType) return ".png";
  if (contentType.includes("image/jpeg")) return ".jpg";
  if (contentType.includes("image/webp")) return ".webp";
  if (contentType.includes("image/png")) return ".png";
  return ".png";
}

function sanitizeAssetKey(assetKey) {
  const normalized = String(assetKey || "image")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "image";
}

function buildArtifactMarkdown({
  postId,
  runId,
  model,
  prompt,
  imageUrl,
  relativeImagePath,
  label
}) {
  return [
    `# fal.ai image run ${runId}`,
    "",
    `- postId: ${postId}`,
    `- label: ${label || "image"}`,
    `- model: ${model}`,
    `- sourceUrl: ${imageUrl}`,
    `- localImage: ${relativeImagePath}`,
    "",
    "## Prompt",
    prompt
  ].join("\n");
}

async function downloadImageBuffer(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image from fal.ai (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get("content-type") || "";
  return {
    buffer,
    contentType
  };
}

export async function generateImageWithFal({ postId, prompt, model, assetKey, label }) {
  const normalizedPrompt = String(prompt || "").trim();
  if (!postId || !String(postId).trim()) {
    throw new Error("postId is required");
  }
  if (!normalizedPrompt) {
    throw new Error("prompt is required");
  }
  if (!process.env.FAL_KEY) {
    throw new Error(
      "FAL_KEY is missing. Set it in apps/post-ops-ui/.env (see .env.example) or export FAL_KEY in your shell."
    );
  }

  const post = await getPost(postId);
  if (!post) {
    throw new Error(`Post ${postId} not found`);
  }

  const startedAt = nowIso();
  const runId = createRunId();
  const selectedModel = getFalModel(model);
  const safeAssetKey = sanitizeAssetKey(assetKey);
  const normalizedLabel = String(label || "Image").trim();

  fal.config({
    credentials: process.env.FAL_KEY
  });

  const result = await fal.subscribe(selectedModel, {
    input: {
      prompt: normalizedPrompt,
      image_size: "portrait_4_3",
      num_images: 1
    }
  });
  const imageUrl = getImageUrl(result);
  if (!imageUrl) {
    throw new Error("fal.ai did not return an image URL");
  }

  const downloaded = await downloadImageBuffer(imageUrl);
  const extension = extensionFromContentType(downloaded.contentType);
  const imageFileName = `${runId}.${safeAssetKey}.image${extension}`;
  const relativeImagePath = path.join("artifacts", postId, imageFileName);
  const absoluteImagePath = path.join(PATHS.contentRoot, relativeImagePath);
  await ensureDir(path.dirname(absoluteImagePath));
  await fs.writeFile(absoluteImagePath, downloaded.buffer);

  const artifactRef = await writeArtifact(
    postId,
    runId,
    "image",
    buildArtifactMarkdown({
      postId,
      runId,
      model: selectedModel,
      prompt: normalizedPrompt,
      imageUrl,
      relativeImagePath,
      label: normalizedLabel
    })
  );

  const imageRef = {
    type: "image-binary",
    path: relativeImagePath,
    version: runId,
    checksum: sha256(downloaded.buffer)
  };

  const finishedAt = nowIso();
  await appendRun(postId, {
    runId,
    postId,
    step: "prompt-to-image",
    inputRefs: [{ type: "post", path: post.paths.post }],
    model: selectedModel,
    promptHash: sha256(normalizedPrompt),
    outputRefs: [artifactRef, imageRef],
    status: "success",
    error: null,
    startedAt,
    finishedAt,
    dryRun: false,
    meta: {
      provider: "fal.ai",
      assetKey: safeAssetKey,
      label: normalizedLabel,
      imagePath: relativeImagePath,
      sourceUrl: imageUrl
    }
  });

  return {
    postId,
    runId,
    model: selectedModel,
    image: {
      url: imageUrl,
      sourceUrl: imageUrl,
      path: relativeImagePath,
      publicPath: `/content/${relativeImagePath}`,
      label: normalizedLabel
    }
  };
}
