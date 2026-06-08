import { randomUUID } from "node:crypto";
import {
  CONTENT_V2_STAGES,
  STATUS_ORDER
} from "../lib/config.js";
import { sha256 } from "../lib/hash.js";
import { getPost, updatePost } from "../storage/index-store.js";
import { readPostBundle } from "../storage/content-repo.js";
import { appendRun, listRuns } from "../storage/run-log-store.js";
import { writeArtifact } from "../storage/artifact-store.js";
import { validateReadyChecklist } from "./ready-guard.js";
import { getRubricRules } from "../web/rubric-registry.js";

function nowIso() {
  return new Date().toISOString();
}

function createRunId() {
  return `${Date.now()}-${randomUUID().slice(0, 8)}`;
}

function hasText(value) {
  return Boolean(String(value || "").trim());
}

function cleanInlineValue(value) {
  return String(value || "")
    .trim()
    .replace(/^`+/, "")
    .replace(/`+$/, "");
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

function extractMetadataValue(markdown, fieldName) {
  const metadata = extractSection(markdown, "Metadata");
  if (!metadata) return "";
  const prefix = `${fieldName.toLowerCase()}:`;
  const line = metadata
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("- ") && entry.slice(2).toLowerCase().startsWith(prefix));
  if (!line) return "";
  return cleanInlineValue(line.slice(2).split(":").slice(1).join(":"));
}

function resolveVisualFormat(post, bundle) {
  return extractMetadataValue(bundle?.post || "", "Visual format") || post.visualFormat || "standard carousel";
}

function collectBulletPoints(text, limit = 6) {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => cleanInlineValue(line.replace(/^- /, "").trim()))
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
        text: cleanInlineValue(match[2])
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);
}

function parsePromptCueLines(sectionText) {
  if (!sectionText) return [];
  const regex = /^-\s+Prompt\s+(\d+)\s*:\s*(.+)$/i;
  return sectionText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => {
      const match = line.match(regex);
      if (!match) return null;
      return {
        index: Number(match[1]),
        text: cleanInlineValue(match[2])
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);
}

function normalizeDraftSlides(slides) {
  if (!Array.isArray(slides)) return [];
  return slides
    .map((slide, index) => {
      if (typeof slide === "string") {
        return {
          index: index + 1,
          text: cleanInlineValue(slide)
        };
      }
      if (slide && typeof slide === "object") {
        return {
          index: Number(slide.index || index + 1),
          text: cleanInlineValue(slide.text || "")
        };
      }
      return null;
    })
    .filter((slide) => slide && hasText(slide.text))
    .sort((a, b) => a.index - b.index);
}

function normalizeDraftSlidePrompts(slidePrompts) {
  if (!Array.isArray(slidePrompts)) return [];
  return slidePrompts
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          index: index + 1,
          text: cleanInlineValue(item)
        };
      }
      if (item && typeof item === "object") {
        return {
          index: Number(item.index || index + 1),
          text: cleanInlineValue(item.text || "")
        };
      }
      return null;
    })
    .filter((item) => item && hasText(item.text))
    .sort((a, b) => a.index - b.index);
}

function buildNarrativeDraft(post, bundle) {
  const thesis =
    cleanInlineValue(extractSection(bundle.post || "", "One-Line Thesis")) || post.title;
  const hook =
    cleanInlineValue(extractSection(bundle.post || "", "Hook")) || post.title;
  const purpose = collectBulletPoints(
    extractSection(bundle.post || "", "Purpose"),
    3
  );
  const captionDirection = collectBulletPoints(
    extractSection(bundle.post || "", "Caption Direction"),
    3
  );
  const title = hook || post.title;
  const caption = [
    thesis,
    "",
    purpose[0] || `${post.title} as a thoughtful entry point into Armenia.`,
    purpose[1] || "Keep the tone editorial, grounded, and specific.",
    "",
    captionDirection[0]
      ? `Direction: ${captionDirection[0]}`
      : "Direction: concise, save-worthy, and human."
  ].join("\n");
  const ctaStyle = captionDirection.find((entry) =>
    entry.toLowerCase().includes("cta style")
  );
  const cta = ctaStyle?.toLowerCase().includes("save")
    ? "Save this post for later and come back when you need the next Armenia entry point."
    : "Share this post with someone building a thoughtful Armenia reference list.";
  return {
    title,
    oneLineThesis: thesis,
    caption,
    cta
  };
}

function buildSlidesDraft(bundle) {
  return parseSlideLines(extractSection(bundle.post || "", "Slide-by-Slide Copy"));
}

function buildCoverPrompt(post, bundle) {
  const promptCues = parsePromptCueLines(
    extractSection(bundle.post || "", "Image Prompt Direction")
  );
  const coverDirection = collectBulletPoints(
    extractSection(bundle.post || "", "Cover Direction"),
    4
  );
  const thesis = cleanInlineValue(extractSection(bundle.post || "", "One-Line Thesis"));
  return [
    promptCues[0]?.text ||
      `Editorial cover image for ${post.title}, tactile realism, quiet composition, no text.`,
    coverDirection.length ? `Cover direction: ${coverDirection.join("; ")}.` : "",
    thesis ? `Narrative anchor: ${thesis}.` : "",
    "Output requirements: vertical 1080x1350, strong focal hierarchy, room for typography overlay, no visible text."
  ]
    .filter(Boolean)
    .join(" ");
}

function buildSlideImagePrompt(post, bundle, slide) {
  const thesis =
    cleanInlineValue(extractSection(bundle.post || "", "One-Line Thesis")) ||
    "Armenia as atmosphere, object-led storytelling, quiet and specific.";
  const cover = collectBulletPoints(
    extractSection(bundle.post || "", "Cover Direction"),
    5
  );
  const imagePromptDirection = extractSection(bundle.post || "", "Image Prompt Direction");
  const editorNotes = collectBulletPoints(
    extractSection(bundle.post || "", "Editor Notes"),
    4
  );
  const thingsToNotice = collectBulletPoints(
    extractSection(bundle.post || "", "Things To Notice"),
    4
  );
  const visualFormat = resolveVisualFormat(post, bundle);
  const promptCues = parsePromptCueLines(imagePromptDirection);
  const slidePromptCue =
    promptCues.find((item) => item.index === slide.index)?.text ||
    promptCues[slide.index - 1]?.text ||
    promptCues[0]?.text ||
    "editorial Armenia documentary frame, tactile realism, clear focal hierarchy, no text";

  return [
    `Create one editorial-quality image for slide ${slide.index} of post "${post.title}" (${post.postId}) in rubric "${post.rubric}".`,
    `Slide copy to support: ${slide.text}`,
    `Narrative context: ${thesis}`,
    `Rubric rules: ${getRubricRules(post.rubric).join("; ")}.`,
    `Visual format: ${visualFormat}.`,
    ...(visualFormat.toLowerCase() === "comic"
      ? [
          "Comic direction:",
          "Use panel-led sequential storytelling with one coherent illustration style across frames.",
          "Keep any speech or on-image text minimal and only where composition clearly supports it."
        ]
      : []),
    "Visual direction:",
    ...(cover.length
      ? cover
      : [
          "tactile object-first composition",
          "warm documentary realism",
          "non-touristic framing"
        ]),
    "Slide-specific cue:",
    slidePromptCue,
    "Key details to preserve:",
    ...(thingsToNotice.length
      ? thingsToNotice
      : [
          "authentic material textures",
          "cultural specificity",
          "natural light and subtle mood"
        ]),
    "Constraints:",
    ...(editorNotes.length
      ? editorNotes
      : ["avoid generic postcard aesthetics", "avoid glossy advertising look"]),
    "Output requirements: one image for one carousel slide, vertical composition suitable for 1080x1350, clean focal hierarchy, no visible text overlays, leave room for later typography overlay."
  ].join("\n");
}

function buildPromptDraft(post, bundle, slides) {
  const coverPrompt = buildCoverPrompt(post, bundle);
  const slidePrompts = slides.map((slide) => ({
    index: slide.index,
    text: buildSlideImagePrompt(post, bundle, slide)
  }));
  return {
    coverPrompt,
    slidePrompts
  };
}

function getNarrativeContent(post, bundle) {
  const derived = buildNarrativeDraft(post, bundle);
  const hasDraft = [
    post.draft?.copy?.title,
    post.draft?.copy?.oneLineThesis,
    post.draft?.copy?.caption,
    post.draft?.copy?.cta
  ].some(hasText);
  const current = hasDraft
    ? {
        title: post.draft.copy.title || derived.title,
        oneLineThesis: post.draft.copy.oneLineThesis || derived.oneLineThesis,
        caption: post.draft.copy.caption || derived.caption,
        cta: post.draft.copy.cta || derived.cta
      }
    : derived;
  return {
    source: hasDraft ? "draft" : "source-derived",
    hasDraft,
    current,
    derived
  };
}

function getSlidesContent(post, bundle) {
  const derived = buildSlidesDraft(bundle);
  const draftSlides = normalizeDraftSlides(post.draft?.copy?.slides);
  return {
    source: draftSlides.length ? "draft" : "source file",
    hasDraft: draftSlides.length > 0,
    current: draftSlides.length ? draftSlides : derived,
    derived
  };
}

function getPromptContent(post, bundle, slidesContent) {
  const derived = buildPromptDraft(post, bundle, slidesContent.current);
  const draftPrompts = normalizeDraftSlidePrompts(post.draft?.prompts?.slidePrompts);
  const hasDraft = hasText(post.draft?.prompts?.coverPrompt) || draftPrompts.length > 0;
  const mergedSlidePrompts =
    draftPrompts.length > 0
      ? slidesContent.current.map((slide) => ({
          index: slide.index,
          text:
            draftPrompts.find((item) => item.index === slide.index)?.text ||
            derived.slidePrompts.find((item) => item.index === slide.index)?.text ||
            ""
        }))
      : derived.slidePrompts;
  return {
    source: hasDraft ? "draft" : "source-derived",
    hasDraft,
    current: {
      coverPrompt: post.draft?.prompts?.coverPrompt || derived.coverPrompt,
      slidePrompts: mergedSlidePrompts
    },
    derived
  };
}

function parseSlideIndexFromMeta(meta = {}) {
  const fromAssetKey = String(meta.assetKey || "").match(/slide-(\d+)/i);
  if (fromAssetKey) return Number(fromAssetKey[1]);
  const fromLabel = String(meta.label || "").match(/slide\s+(\d+)/i);
  if (fromLabel) return Number(fromLabel[1]);
  return null;
}

function buildImageExports(postId, runs, slides) {
  const imageRuns = runs
    .filter((run) => run.step === "prompt-to-image" && run.status === "success")
    .map((run) => {
      const imageBinaryRef = (run.outputRefs || []).find(
        (ref) => ref.type === "image-binary"
      );
      const localPath = run.meta?.imagePath || imageBinaryRef?.path || "";
      const slideIndex = parseSlideIndexFromMeta(run.meta);
      return {
        runId: run.runId,
        label: run.meta?.label || "Generated image",
        slideIndex,
        assetKey: run.meta?.assetKey || null,
        createdAt: run.startedAt,
        sourceUrl: run.meta?.sourceUrl || null,
        localPath,
        localUrl: localPath ? `/content/${localPath}` : null
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const bySlide = slides.map((slide) => ({
    slideIndex: slide.index,
    slideText: slide.text,
    items: imageRuns.filter((item) => item.slideIndex === slide.index)
  }));

  const uncategorized = imageRuns.filter((item) => item.slideIndex == null);

  return {
    total: imageRuns.length,
    latest: imageRuns[0] || null,
    items: imageRuns,
    bySlide,
    uncategorized,
    postId
  };
}

function buildChecklistItems(post, readyCheck) {
  const stageMap = {
    copyApproved: "narrative",
    captionAndCtaLocked: "narrative",
    coverApproved: "prompts",
    promptsReady: "prompts",
    storyPackReady: "export"
  };
  const labels = {
    copyApproved: "Narrative copy approved",
    captionAndCtaLocked: "Caption and CTA locked",
    coverApproved: "Cover direction approved",
    promptsReady: "Prompts ready",
    storyPackReady: "Export package ready"
  };
  return Object.keys(post.readyChecklist || {}).map((key) => ({
    key,
    label: labels[key] || key,
    stageId: stageMap[key] || "export",
    value: Boolean(post.readyChecklist[key]),
    blocking: readyCheck.missing.includes(key)
  }));
}

function getRecommendedStatus({ briefReady, narrativeReady, slidesReady, promptsReady, hasImages, exportReady, readyCheck }) {
  if (readyCheck.ok) return "ready";
  if (exportReady) return "editing";
  if (hasImages) return "editing";
  if (promptsReady) return "asset-ready";
  if (slidesReady) return "prompting";
  if (narrativeReady) return "storyboarding";
  if (briefReady) return "writing";
  return "planned";
}

function createStageMeta(stageDef, extra) {
  return {
    id: stageDef.id,
    title: stageDef.title,
    description: stageDef.description,
    sourceLabel: stageDef.sourceLabel,
    recommendedStatus: stageDef.recommendedStatus,
    ...extra
  };
}

function buildStages(post, bundle, narrative, slides, prompts, images, readyCheck) {
  const briefReady = hasText(bundle.post);
  const narrativeReady =
    hasText(narrative.current.title) &&
    hasText(narrative.current.oneLineThesis) &&
    hasText(narrative.current.caption) &&
    hasText(narrative.current.cta);
  const narrativeApproved =
    post.approvals?.brief === "approved" &&
    post.readyChecklist?.copyApproved &&
    post.readyChecklist?.captionAndCtaLocked;
  const slidesReady = slides.current.length > 0;
  const slidesApproved = post.approvals?.storyboard === "approved";
  const promptsReady =
    hasText(prompts.current.coverPrompt) && prompts.current.slidePrompts.length > 0;
  const promptsApproved =
    post.readyChecklist?.promptsReady && post.readyChecklist?.coverApproved;
  const hasImages = images.total > 0;
  const exportReady =
    post.readyChecklist?.storyPackReady && post.approvals?.storyPack === "approved";

  const findStage = (id) => CONTENT_V2_STAGES.find((stage) => stage.id === id);

  return [
    createStageMeta(findStage("brief"), {
      state: briefReady ? "complete" : "blocked",
      available: true,
      disabledReason: null,
      summary: briefReady
        ? "Source brief loaded from the content file."
        : "The source brief file is missing.",
      actions: {
        viewSource: {
          enabled: briefReady,
          disabledReason: briefReady ? null : "Brief source is missing."
        }
      }
    }),
    createStageMeta(findStage("narrative"), {
      state: narrativeApproved
        ? "approved"
        : narrativeReady
          ? "ready_for_review"
          : briefReady
            ? "available"
            : "blocked",
      available: briefReady,
      disabledReason: briefReady ? null : "Add the source brief first.",
      summary: narrative.source === "draft"
        ? "Working draft is loaded from tracker draft state."
        : "No working draft yet. V2 will generate it from the source brief.",
      actions: {
        generate: {
          enabled: briefReady,
          disabledReason: briefReady ? null : "Add the source brief first."
        },
        approve: {
          enabled: narrativeReady,
          disabledReason: narrativeReady
            ? null
            : "Generate the narrative draft before approving it."
        }
      }
    }),
    createStageMeta(findStage("slides"), {
      state: slidesApproved
        ? "approved"
        : slidesReady
          ? "ready_for_review"
          : narrativeReady
            ? "available"
            : "blocked",
      available: narrativeReady,
      disabledReason: narrativeReady
        ? null
        : "Narrative draft must exist before slides are synced.",
      summary: slides.source === "draft"
        ? "Slides are coming from working draft state."
        : "Slides are being previewed from the source brief.",
      actions: {
        generate: {
          enabled: narrativeReady,
          disabledReason: narrativeReady
            ? null
            : "Generate the narrative draft first."
        },
        approve: {
          enabled: slidesReady,
          disabledReason: slidesReady
            ? null
            : "Sync slides into draft before approving them."
        }
      }
    }),
    createStageMeta(findStage("prompts"), {
      state: promptsApproved
        ? "approved"
        : promptsReady
          ? "ready_for_review"
          : slidesReady
            ? "available"
            : "blocked",
      available: slidesReady,
      disabledReason: slidesReady
        ? null
        : "Slides must be available before prompts can be built.",
      summary: prompts.source === "draft"
        ? "Prompt set is loaded from working draft state."
        : "Prompt set is being derived from the brief and slide text.",
      actions: {
        generate: {
          enabled: slidesReady,
          disabledReason: slidesReady
            ? null
            : "Sync slides before building prompts."
        },
        approve: {
          enabled: promptsReady,
          disabledReason: promptsReady
            ? null
            : "Build prompts before approving them."
        }
      }
    }),
    createStageMeta(findStage("images"), {
      state: hasImages ? "complete" : promptsReady ? "available" : "blocked",
      available: promptsReady,
      disabledReason: promptsReady
        ? null
        : "Prompt set must exist before images can be generated.",
      summary: hasImages
        ? `${images.total} generated image result${images.total === 1 ? "" : "s"} available.`
        : "No generated images yet.",
      actions: {
        generate: {
          enabled: promptsReady,
          disabledReason: promptsReady
            ? null
            : "Build prompts before generating images."
        }
      }
    }),
    createStageMeta(findStage("export"), {
      state: exportReady
        ? "approved"
        : hasImages
          ? "ready_for_review"
          : "blocked",
      available: hasImages,
      disabledReason: hasImages
        ? null
        : "Generate at least one image before marking export ready.",
      summary: exportReady
        ? "Export package is marked ready."
        : hasImages
          ? "Images exist; review links and mark export ready when satisfied."
          : "No exportable images yet.",
      actions: {
        approve: {
          enabled: hasImages,
          disabledReason: hasImages
            ? null
            : "Generate images before export can be marked ready."
        }
      }
    })
  ];
}

function summarizeRunsForWorkspace(runs) {
  return runs.slice(0, 12).map((run) => ({
    runId: run.runId,
    step: run.step,
    status: run.status,
    startedAt: run.startedAt,
    meta: run.meta || {}
  }));
}

export async function getContentV2Workspace(postId) {
  const post = await getPost(postId);
  if (!post) {
    throw new Error(`Post ${postId} not found`);
  }
  const bundle = await readPostBundle(post);
  const runs = await listRuns(postId);
  const readyCheck = validateReadyChecklist(post.readyChecklist);
  const briefReady = hasText(bundle.post);
  const visualFormat = resolveVisualFormat(post, bundle);
  const narrative = getNarrativeContent(post, bundle);
  const slides = getSlidesContent(post, bundle);
  const prompts = getPromptContent(post, bundle, slides);
  const images = buildImageExports(postId, runs, slides.current);
  const stages = buildStages(post, bundle, narrative, slides, prompts, images, readyCheck);
  const checklistItems = buildChecklistItems(post, readyCheck);
  const recommendedStatus = getRecommendedStatus({
    briefReady,
    narrativeReady: stages.find((stage) => stage.id === "narrative")?.actions.approve.enabled,
    slidesReady: slides.current.length > 0,
    promptsReady:
      hasText(prompts.current.coverPrompt) && prompts.current.slidePrompts.length > 0,
    hasImages: images.total > 0,
    exportReady: post.readyChecklist?.storyPackReady,
    readyCheck
  });

  return {
    post: {
      postId: post.postId,
      title: post.title,
      rubric: post.rubric,
      format: post.format,
      visualFormat,
      category: post.category,
      priority: post.priority,
      status: post.status,
      paths: post.paths
    },
    workflow: {
      trackerStatus: post.status,
      recommendedStatus,
      statusOptions: STATUS_ORDER,
      ready: {
        ok: readyCheck.ok,
        missing: readyCheck.missing,
        completedCount: checklistItems.filter((item) => item.value).length,
        totalCount: checklistItems.length
      },
      checklistItems,
      approvals: post.approvals
    },
    brief: {
      source: "source file",
      path: post.paths.post,
      markdown: bundle.post || "",
      hasSource: briefReady
    },
    narrative,
    slides,
    prompts: {
      ...prompts,
      modelDefault: process.env.FAL_MODEL || "fal-ai/flux/schnell"
    },
    images,
    stages,
    recentRuns: summarizeRunsForWorkspace(runs)
  };
}

async function recordStageRun({
  post,
  step,
  artifactType,
  artifactContent,
  meta
}) {
  const runId = createRunId();
  const startedAt = nowIso();
  const outputRefs = [];
  if (artifactContent) {
    const artifact = await writeArtifact(post.postId, runId, artifactType, artifactContent);
    outputRefs.push(artifact);
  }
  await appendRun(post.postId, {
    runId,
    postId: post.postId,
    step,
    inputRefs: [{ type: "post", path: post.paths.post }],
    model: "content-v2",
    promptHash: sha256(`${step}:${artifactContent || JSON.stringify(meta || {})}`),
    outputRefs,
    status: "success",
    error: null,
    startedAt,
    finishedAt: nowIso(),
    dryRun: false,
    meta: meta || {}
  });
  return runId;
}

export async function generateNarrativeDraftV2(postId) {
  const post = await getPost(postId);
  if (!post) throw new Error(`Post ${postId} not found`);
  const bundle = await readPostBundle(post);
  const draft = buildNarrativeDraft(post, bundle);
  await updatePost(postId, {
    draft: {
      copy: draft
    },
    approvals: {
      brief: "review"
    },
    readyChecklist: {
      copyApproved: false,
      captionAndCtaLocked: false
    }
  });
  await recordStageRun({
    post,
    step: "v2-narrative-generate",
    artifactType: "copy",
    artifactContent: [
      `# Content V2 Narrative Draft for ${post.postId}`,
      "",
      `- title: ${draft.title}`,
      "",
      "## One-Line Thesis",
      draft.oneLineThesis,
      "",
      "## Caption",
      draft.caption,
      "",
      "## CTA",
      draft.cta
    ].join("\n"),
    meta: {
      stageId: "narrative"
    }
  });
  return getContentV2Workspace(postId);
}

export async function generateSlidesDraftV2(postId) {
  const post = await getPost(postId);
  if (!post) throw new Error(`Post ${postId} not found`);
  const bundle = await readPostBundle(post);
  const slides = buildSlidesDraft(bundle);
  if (!slides.length) {
    throw new Error("No slide copy found in the source brief");
  }
  await updatePost(postId, {
    draft: {
      copy: {
        slides
      }
    },
    approvals: {
      storyboard: "review"
    }
  });
  await recordStageRun({
    post,
    step: "v2-slides-sync",
    artifactType: "copy",
    artifactContent: [
      `# Content V2 Slides for ${post.postId}`,
      "",
      ...slides.map((slide) => `- Slide ${slide.index}: ${slide.text}`)
    ].join("\n"),
    meta: {
      stageId: "slides",
      slideCount: slides.length
    }
  });
  return getContentV2Workspace(postId);
}

export async function generatePromptsDraftV2(postId) {
  const post = await getPost(postId);
  if (!post) throw new Error(`Post ${postId} not found`);
  const bundle = await readPostBundle(post);
  const slides = getSlidesContent(post, bundle);
  if (!slides.current.length) {
    throw new Error("Slides are required before prompts can be built");
  }
  const prompts = buildPromptDraft(post, bundle, slides.current);
  await updatePost(postId, {
    draft: {
      prompts
    },
    readyChecklist: {
      promptsReady: false,
      coverApproved: false
    }
  });
  await recordStageRun({
    post,
    step: "v2-prompts-build",
    artifactType: "prompt",
    artifactContent: [
      `# Content V2 Prompts for ${post.postId}`,
      "",
      "## Cover Prompt",
      prompts.coverPrompt,
      "",
      "## Slide Prompts",
      ...prompts.slidePrompts.map(
        (item) => `### Slide ${item.index}\n${item.text}\n`
      )
    ].join("\n"),
    meta: {
      stageId: "prompts",
      slidePromptCount: prompts.slidePrompts.length
    }
  });
  return getContentV2Workspace(postId);
}

export async function approveContentV2Stage({ postId, stageId }) {
  const post = await getPost(postId);
  if (!post) throw new Error(`Post ${postId} not found`);
  const patchByStage = {
    narrative: {
      approvals: {
        brief: "approved"
      },
      readyChecklist: {
        copyApproved: true,
        captionAndCtaLocked: true
      }
    },
    slides: {
      approvals: {
        storyboard: "approved"
      }
    },
    prompts: {
      readyChecklist: {
        promptsReady: true,
        coverApproved: true
      }
    },
    export: {
      approvals: {
        storyPack: "approved"
      },
      readyChecklist: {
        storyPackReady: true
      }
    }
  };
  const patch = patchByStage[stageId];
  if (!patch) {
    throw new Error(`Unsupported V2 stage "${stageId}"`);
  }
  await updatePost(postId, patch);
  return getContentV2Workspace(postId);
}
