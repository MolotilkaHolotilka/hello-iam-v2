import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { GENERATION_STEPS, PATHS } from "../lib/config.js";
import { sha256 } from "../lib/hash.js";
import { getPost } from "../storage/index-store.js";
import { readPostBundle } from "../storage/content-repo.js";
import { appendRun } from "../storage/run-log-store.js";
import { writeArtifact } from "../storage/artifact-store.js";

function nowIso() {
  return new Date().toISOString();
}

function createRunId() {
  return `${Date.now()}-${randomUUID().slice(0, 8)}`;
}

function buildCopyDraft(post) {
  return [
    `# Copy Draft for ${post.postId} — ${post.title}`,
    "",
    "## Hook",
    `${post.title} as a first contact with Armenia.`,
    "",
    "## Slide Copy Draft",
    "- Slide 1: Start with one tangible object.",
    "- Slide 2: Name one detail that most people miss.",
    "- Slide 3: Place it in Armenian daily life.",
    "- Slide 4: Add one emotional shift.",
    "- Slide 5: Close with a quiet insight.",
    "- Slide 6: Soft CTA to save/follow."
  ].join("\n");
}

function buildStoryboardDraft(post) {
  return [
    `# Storyboard Draft for ${post.postId} — ${post.title}`,
    "",
    "## Scene Logic",
    "- Start: tactile recognition.",
    "- Middle: context and atmosphere.",
    "- End: memory + light CTA.",
    "",
    "## Shot Suggestions",
    "- Shot 01: Hero object static.",
    "- Shot 02: Macro texture pass.",
    "- Shot 03: Wider context shot.",
    "- Shot 04: Human interaction without presenter framing.",
    "- Shot 05: Quiet closing."
  ].join("\n");
}

async function buildManifestDraft(post) {
  const templateRaw = await fs.readFile(PATHS.manifestTemplateFile, "utf8");
  const template = JSON.parse(templateRaw);
  template.post_id = post.postId;
  template.title = post.title;
  template.intent.rubric = post.rubric;
  return JSON.stringify(template, null, 2);
}

async function generateStepOutput(step, post) {
  switch (step) {
    case "brief-to-copy":
      return {
        type: "copy",
        content: buildCopyDraft(post)
      };
    case "copy-to-storyboard":
      return {
        type: "storyboard",
        content: buildStoryboardDraft(post)
      };
    case "storyboard-to-manifest":
      return {
        type: "manifest",
        content: await buildManifestDraft(post)
      };
    default:
      throw new Error(`Unsupported generation step: ${step}`);
  }
}

export async function runGeneration({
  postId,
  step,
  dryRun = false,
  model = "deterministic-v1"
}) {
  if (!GENERATION_STEPS.includes(step)) {
    throw new Error(`Invalid step "${step}"`);
  }

  const post = await getPost(postId);
  if (!post) {
    throw new Error(`Post ${postId} not found`);
  }

  const startedAt = nowIso();
  const runId = createRunId();
  const bundle = await readPostBundle(post);
  const inputFingerprint = sha256(
    JSON.stringify({
      post,
      step,
      bundle
    })
  );

  let outputRefs = [];
  let status = "success";
  let error = null;
  try {
    const generated = await generateStepOutput(step, post);
    if (!dryRun) {
      const artifact = await writeArtifact(
        postId,
        runId,
        generated.type,
        generated.content
      );
      outputRefs.push(artifact);
      if (generated.type === "manifest") {
        const latestPath = path.join("artifacts", postId, "manifest.latest.json");
        await fs.writeFile(
          path.join(PATHS.root, latestPath),
          generated.content,
          "utf8"
        );
      }
    } else {
      outputRefs.push({
        type: generated.type,
        path: "dry-run-preview",
        version: runId,
        checksum: sha256(generated.content)
      });
    }
  } catch (e) {
    status = "failed";
    error = e.message;
  }

  const finishedAt = nowIso();
  const runPayload = {
    runId,
    postId,
    step,
    inputRefs: [
      { type: "post", path: post.paths.post },
      { type: "storyboard", path: post.paths.storyboard || "" },
      { type: "storyPack", path: post.paths.storyPack || "" },
      { type: "manifest", path: post.paths.manifest || "" }
    ],
    model,
    promptHash: inputFingerprint,
    outputRefs,
    status,
    error,
    startedAt,
    finishedAt,
    dryRun
  };

  await appendRun(postId, runPayload);
  if (status === "failed") {
    throw new Error(error);
  }
  return runPayload;
}
