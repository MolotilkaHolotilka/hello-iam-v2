import { randomUUID } from "node:crypto";
import { getPost, listPosts, updatePost } from "../storage/index-store.js";
import { readPostBundle } from "../storage/content-repo.js";
import { appendRun, listRuns } from "../storage/run-log-store.js";
import { writeArtifact } from "../storage/artifact-store.js";

function nowIso() {
  return new Date().toISOString();
}

function extractSection(markdown, sectionTitle) {
  if (!markdown) return "";
  const escapedTitle = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `##\\s+${escapedTitle}\\n([\\s\\S]*?)(\\n##\\s+|$)`,
    "i"
  );
  const match = markdown.match(pattern);
  return match ? match[1].trim() : "";
}

function collectBulletPoints(text, limit = 6) {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function parseSlideLines(sectionText) {
  if (!sectionText) return [];
  const regex = /^-\s+Slide\s+(\d+)\s*:\s*(.+)$/i;
  return sectionText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => {
      const match = line.match(regex);
      if (!match) return null;
      return {
        index: Number(match[1]),
        text: match[2].trim()
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);
}

function normalizeInstruction(instruction) {
  if (!instruction || !String(instruction).trim()) return "keep concise and specific";
  return String(instruction).trim();
}

function summarizeBundle(post, bundle) {
  const thesis = extractSection(bundle.post || "", "One-Line Thesis");
  const cover = collectBulletPoints(extractSection(bundle.post || "", "Cover Direction"), 3);
  const slideCopy = parseSlideLines(extractSection(bundle.post || "", "Slide-by-Slide Copy"));
  return {
    postId: post.postId,
    title: post.title,
    rubric: post.rubric,
    thesis: thesis || post.title,
    cover,
    slideCount: slideCopy.length
  };
}

function generateVariantValue(target, summary, instruction) {
  const safeInstruction = normalizeInstruction(instruction);
  if (target === "title") {
    return `${summary.title} — refined for ${summary.rubric.toLowerCase()} (${safeInstruction})`;
  }
  if (target === "oneLineThesis") {
    return `${summary.thesis}. Tone: ${safeInstruction}.`;
  }
  if (target === "caption") {
    return [
      `${summary.title} through a quiet Armenian lens.`,
      "",
      "We focus on material details, daily rituals, and lived texture over postcard cliches.",
      "",
      `Editorial note: ${safeInstruction}.`,
      "",
      "Save this for your next Armenia inspiration thread."
    ].join("\n");
  }
  if (target === "cta") {
    return "Save this post and send it to someone planning Armenia thoughtfully.";
  }
  if (target === "slides") {
    const count = Math.max(summary.slideCount || 0, 6);
    return Array.from({ length: count }, (_value, index) => ({
      index: index + 1,
      text: `Slide ${index + 1}: ${summary.title} detail beat ${index + 1} (${safeInstruction}).`
    }));
  }
  if (target === "coverPrompt") {
    return `Editorial Armenia still life, tactile realism, soft daylight, object-led narrative, avoid stock style. Constraint: ${safeInstruction}.`;
  }
  if (target === "slidePrompts") {
    const count = Math.max(summary.slideCount || 0, 6);
    return Array.from({ length: count }, (_value, index) => ({
      index: index + 1,
      text: `Prompt ${index + 1}: Armenia documentary-editorial frame, clear focal hierarchy, no text overlay. Constraint: ${safeInstruction}.`
    }));
  }
  throw new Error(`Unsupported target "${target}"`);
}

function assertGenerationTarget(target) {
  const validTargets = [
    "title",
    "oneLineThesis",
    "slides",
    "caption",
    "cta",
    "coverPrompt",
    "slidePrompts"
  ];
  if (!validTargets.includes(target)) {
    throw new Error(`Unsupported generation target "${target}"`);
  }
}

function formatVariantArtifact(variant) {
  return [
    `# Generated Variant ${variant.variantId}`,
    "",
    `- target: ${variant.target}`,
    `- createdAt: ${variant.createdAt}`,
    `- instruction: ${variant.instruction}`,
    "",
    "## Value",
    typeof variant.value === "string"
      ? variant.value
      : JSON.stringify(variant.value, null, 2)
  ].join("\n");
}

function applyVariantToDraft(post, variant) {
  const patch = {
    generation: {
      lastAppliedVariantId: variant.variantId
    }
  };
  if (["title", "oneLineThesis", "slides", "caption", "cta"].includes(variant.target)) {
    patch.draft = {
      copy: {
        [variant.target]: variant.value
      }
    };
    patch.readyChecklist = {
      copyApproved: false,
      captionAndCtaLocked:
        variant.target === "caption" || variant.target === "cta"
          ? false
          : post.readyChecklist?.captionAndCtaLocked || false
    };
  } else if (["coverPrompt", "slidePrompts"].includes(variant.target)) {
    patch.draft = {
      prompts: {
        [variant.target]: variant.value
      }
    };
    patch.readyChecklist = {
      promptsReady: false,
      coverApproved:
        variant.target === "coverPrompt"
          ? false
          : post.readyChecklist?.coverApproved || false
    };
  }
  return patch;
}

export async function generateContentVariant({ postId, target, instruction }) {
  assertGenerationTarget(target);
  const post = await getPost(postId);
  if (!post) {
    throw new Error(`Post ${postId} not found`);
  }
  const bundle = await readPostBundle(post);
  const summary = summarizeBundle(post, bundle);
  const value = generateVariantValue(target, summary, instruction);
  const createdAt = nowIso();
  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const variant = {
    variantId: randomUUID().slice(0, 12),
    runId,
    target,
    instruction: normalizeInstruction(instruction),
    value,
    createdAt,
    summary
  };

  const artifact = await writeArtifact(
    postId,
    runId,
    target.includes("Prompt") ? "prompt" : "copy",
    formatVariantArtifact(variant)
  );

  await appendRun(postId, {
    runId,
    postId,
    step: "content-generate",
    inputRefs: [{ type: "post", path: post.paths.post }],
    model: "deterministic-v1",
    promptHash: `${target}:${variant.instruction}`,
    outputRefs: [artifact],
    status: "success",
    error: null,
    startedAt: createdAt,
    finishedAt: nowIso(),
    dryRun: false,
    meta: {
      target,
      variantId: variant.variantId
    }
  });

  const previousVariants = post.generation?.variants || [];
  const variants = [variant, ...previousVariants].slice(0, 20);
  const updatedPost = await updatePost(postId, {
    generation: {
      lastRunId: runId,
      lastStep: "content-generate",
      variants
    }
  });

  return {
    post: updatedPost,
    variant
  };
}

export async function applyGeneratedVariant({ postId, variantId }) {
  const post = await getPost(postId);
  if (!post) {
    throw new Error(`Post ${postId} not found`);
  }
  const variant = (post.generation?.variants || []).find(
    (item) => item.variantId === variantId
  );
  if (!variant) {
    throw new Error(`Variant ${variantId} not found`);
  }
  const patch = applyVariantToDraft(post, variant);
  const updated = await updatePost(postId, patch);
  return {
    post: updated,
    appliedVariantId: variantId
  };
}

export async function updateEditorialSettings({ postId, editorial }) {
  const post = await getPost(postId);
  if (!post) {
    throw new Error(`Post ${postId} not found`);
  }
  const patch = {
    editorial: {
      tone: editorial?.tone || post.editorial?.tone || "editorial",
      audience: editorial?.audience || post.editorial?.audience || "instagram",
      constraints: Array.isArray(editorial?.constraints)
        ? editorial.constraints
        : post.editorial?.constraints || []
    }
  };
  const updated = await updatePost(postId, patch);
  return updated;
}

export async function getCmsDashboard() {
  const posts = await listPosts();
  const byStatus = posts.reduce((acc, post) => {
    acc[post.status] = (acc[post.status] || 0) + 1;
    return acc;
  }, {});
  const blocked = posts.filter((post) => {
    if (post.status === "ready") return false;
    return Object.values(post.readyChecklist || {}).some((value) => value === false);
  }).length;
  const recentRuns = [];
  const samplePosts = posts.slice(0, 6);
  for (const post of samplePosts) {
    const runs = await listRuns(post.postId);
    if (runs[0]) {
      recentRuns.push({
        postId: post.postId,
        runId: runs[0].runId,
        step: runs[0].step,
        startedAt: runs[0].startedAt
      });
    }
  }
  recentRuns.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return {
    totalPosts: posts.length,
    byStatus,
    blockedByChecklist: blocked,
    recentRuns: recentRuns.slice(0, 8)
  };
}

export async function getWorkflowQueue() {
  const posts = await listPosts();
  return posts
    .map((post) => {
      const missing = Object.entries(post.readyChecklist || {})
        .filter((entry) => !entry[1])
        .map((entry) => entry[0]);
      return {
        postId: post.postId,
        title: post.title,
        status: post.status,
        missingChecklistFlags: missing,
        approvals: post.approvals
      };
    })
    .filter((item) => item.status !== "ready")
    .sort((a, b) => a.postId.localeCompare(b.postId));
}
