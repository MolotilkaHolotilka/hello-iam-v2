import { createContentV2Controller } from "./content-v2.js";
import {
  getRubricDisplayLabel,
  getRubricRules,
  sortRubrics
} from "./rubric-registry.js";

const STATUS_ORDER = [
  "planned",
  "writing",
  "storyboarding",
  "prompting",
  "asset-ready",
  "editing",
  "ready"
];
const APPROVAL_STATES = ["draft", "review", "approved"];
const APPROVAL_SECTIONS = ["brief", "storyboard", "storyPack", "manifest"];
const CHECKLIST_FLAGS = [
  "copyApproved",
  "coverApproved",
  "promptsReady",
  "storyPackReady",
  "captionAndCtaLocked"
];
const AI_TARGETS = [
  "title",
  "oneLineThesis",
  "slides",
  "caption",
  "cta",
  "coverPrompt",
  "slidePrompts"
];

let posts = [];
let selectedPostId = null;
let searchQuery = "";
let rubricFilter = "all";
let currentSection = "dashboard";
let currentPipelineStep = 0;
let currentBundle = { post: "", storyboard: "", storyPack: "", manifest: "" };
let contentV2Controller = null;

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function byId(id) {
  return document.getElementById(id);
}

function autosizeTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.max(textarea.scrollHeight, 120)}px`;
}

function autosizeAllTextareas() {
  document.querySelectorAll("textarea").forEach((textarea) => {
    autosizeTextarea(textarea);
  });
}

function setFeedback(message, tone = "neutral") {
  const el = byId("feedback");
  const toneClassMap = {
    neutral: "text-stone-600",
    success: "text-emerald-700",
    error: "text-red-700",
    loading: "text-amber-700"
  };
  el.className = `mt-3 min-h-6 rounded-md px-2 py-1 text-sm ${
    toneClassMap[tone] || toneClassMap.neutral
  }`;
  el.textContent = message;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function formatStatusLabel(status) {
  const index = STATUS_ORDER.indexOf(status);
  if (index === -1) return status;
  const code = String(index + 1).padStart(2, "0");
  return `${code} - ${status}`;
}

function getSelectedPost() {
  return posts.find((post) => post.postId === selectedPostId) || null;
}

function resetGeneratedImagePreview() {
  const preview = byId("generated-image-preview");
  const meta = byId("generated-image-meta");
  const links = byId("generated-image-links");
  const falLink = byId("generated-image-fal-link");
  const localLink = byId("generated-image-local-link");
  preview.classList.add("hidden");
  preview.removeAttribute("src");
  meta.textContent = "No image generated yet.";
  links.classList.add("hidden");
  falLink.setAttribute("href", "#");
  localLink.setAttribute("href", "#");
}

function showGeneratedImagePreview(imagePayload) {
  const preview = byId("generated-image-preview");
  const meta = byId("generated-image-meta");
  const links = byId("generated-image-links");
  const falLink = byId("generated-image-fal-link");
  const localLink = byId("generated-image-local-link");
  const publicPath = imagePayload?.publicPath || "";
  const falUrl = imagePayload?.sourceUrl || imagePayload?.url || "";
  if (!publicPath && !falUrl) {
    resetGeneratedImagePreview();
    return;
  }
  if (publicPath) {
    preview.src = publicPath;
    preview.classList.remove("hidden");
    localLink.setAttribute("href", publicPath);
  } else {
    preview.classList.add("hidden");
    preview.removeAttribute("src");
    localLink.setAttribute("href", "#");
  }
  if (falUrl) {
    falLink.setAttribute("href", falUrl);
  } else {
    falLink.setAttribute("href", "#");
  }
  links.classList.remove("hidden");
  meta.textContent = imagePayload?.label
    ? `${imagePayload.label} saved at ${imagePayload.path}`
    : `Saved at ${imagePayload.path}`;
}

function getVisiblePosts() {
  return posts.filter((post) => {
    const matchesRubric = rubricFilter === "all" || post.rubric === rubricFilter;
    if (!matchesRubric) return false;
    const haystack = `${post.postId} ${post.title}`.toLowerCase();
    return haystack.includes(searchQuery.toLowerCase());
  });
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
  return line.slice(2).split(":").slice(1).join(":").replace(/`/g, "").trim();
}

function resolveVisualFormat(post, markdown) {
  return extractMetadataValue(markdown, "Visual format") || post.visualFormat || "standard carousel";
}

function collectBulletPoints(text, limit = 5) {
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
        text: match[2].trim()
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);
}

function slideCode(index) {
  return String(index).padStart(2, "0");
}

function buildSlideImagePrompt(post, markdown, slide) {
  const thesis = extractSection(markdown, "One-Line Thesis");
  const cover = extractSection(markdown, "Cover Direction");
  const imagePromptDirection = extractSection(markdown, "Image Prompt Direction");
  const editorNotes = extractSection(markdown, "Editor Notes");
  const thingsToNotice = extractSection(markdown, "Things To Notice");
  const visualFormat = resolveVisualFormat(post, markdown);
  const visualBullets = collectBulletPoints(cover, 5);
  const noticeBullets = collectBulletPoints(thingsToNotice, 4);
  const notesBullets = collectBulletPoints(editorNotes, 4);
  const promptCues = parsePromptCueLines(imagePromptDirection);
  const slidePromptCue =
    promptCues.find((item) => item.index === slide.index)?.text ||
    promptCues[slide.index - 1]?.text ||
    promptCues[0]?.text ||
    "editorial Armenia documentary frame, tactile realism, clear focal hierarchy, no text";

  return [
    `Create one editorial-quality image for slide ${slide.index} of post "${post.title}" (${post.postId}) in rubric "${post.rubric}".`,
    `Slide copy to support: ${slide.text}`,
    `Narrative context: ${
      thesis || "Armenia as atmosphere, object-led storytelling, quiet and specific."
    }`,
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
    ...(visualBullets.length
      ? visualBullets
      : [
          "tactile object-first composition",
          "warm documentary realism",
          "non-touristic framing"
        ]),
    "Slide-specific cue:",
    slidePromptCue,
    "Key details to preserve:",
    ...(noticeBullets.length
      ? noticeBullets
      : [
          "authentic material textures",
          "cultural specificity",
          "natural light and subtle mood"
        ]),
    "Constraints:",
    ...(notesBullets.length
      ? notesBullets
      : ["avoid generic postcard aesthetics", "avoid glossy advertising look"]),
    "Output requirements: one image for one carousel slide, vertical composition suitable for 1080x1350, clean focal hierarchy, no visible text overlays, leave room for later typography overlay."
  ].join("\n");
}

function renderSlidePromptCards(post, markdown) {
  const slides = parseSlideLines(extractSection(markdown, "Slide-by-Slide Copy"));
  if (!slides.length) {
    return '<div class="rounded-lg border border-dashed border-stone-300 bg-white p-3 text-sm text-stone-500">No slide copy found yet. Add a `Slide-by-Slide Copy` section first.</div>';
  }
  return slides
    .map((slide) => {
      const prompt = buildSlideImagePrompt(post, markdown, slide);
      const slideLabel = `Slide ${slideCode(slide.index)}`;
      return `
        <article class="rounded-lg border border-stone-200 bg-white p-3">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h5 class="text-sm font-semibold text-stone-800">${escapeHtml(slideLabel)}</h5>
              <p class="mt-1 text-xs text-stone-500">Text to place on the slide:</p>
            </div>
            <button
              data-generate-slide-image="${slide.index}"
              class="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600"
            >
              Generate Image (fal.ai)
            </button>
          </div>
          <div class="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-2 text-sm text-stone-800">${escapeHtml(
            slide.text
          )}</div>
          <label class="mt-3 block text-xs font-medium uppercase tracking-wide text-stone-600">Prompt</label>
          <textarea
            readonly
            data-slide-prompt="${slide.index}"
            class="mt-1 min-h-[180px] w-full rounded-lg border border-stone-300 bg-white p-2 font-mono text-xs"
          >${escapeHtml(prompt)}</textarea>
        </article>
      `;
    })
    .join("");
}

function buildPromptAssemblyTrace(post, markdown) {
  const thesis = extractSection(markdown, "One-Line Thesis");
  const slideCopy = extractSection(markdown, "Slide-by-Slide Copy");
  const imageDir = extractSection(markdown, "Image Prompt Direction");
  const cover = extractSection(markdown, "Cover Direction");
  const visualFormat = resolveVisualFormat(post, markdown);
  return [
    "Prompt Assembly Trace",
    "---------------------",
    `postId: ${post.postId}`,
    `rubric: ${post.rubric}`,
    `visual format: ${visualFormat}`,
    "",
    "inputs:",
    `- brief/post markdown: ${post.paths?.post || "n/a"}`,
    `- rubric rules: ${getRubricRules(post.rubric).join("; ")}`,
    `- narrative thesis: ${thesis || "(missing)"}`,
    `- slide breakdown: ${slideCopy ? "present" : "missing"}`,
    `- prompt direction: ${imageDir ? "present" : "missing"}`,
    "",
    "template:",
    "- base template = editorial visual prompt",
    "- constraints = no text overlay, no stock aesthetic",
    "- output = 1080x1350 vertical composition",
    "",
    "cover direction (snippet):",
    cover || "(missing)",
    "",
    "image prompt direction (snippet):",
    imageDir || "(missing)"
  ].join("\n");
}

function buildSlideBreakdown(post, markdown) {
  const slideCopy = extractSection(markdown, "Slide-by-Slide Copy");
  const structure = extractSection(markdown, "Carousel Structure");
  return [
    `Post: ${post.postId} — ${post.title}`,
    "",
    "Carousel Structure:",
    structure || "(missing)",
    "",
    "Slide-by-Slide Copy:",
    slideCopy || "(missing)"
  ].join("\n");
}

function renderNav() {
  const labels = {
    dashboard: ["Dashboard", "CMS overview for post operations and AI generation."],
    content: ["Content", "Post Workspace: editor, AI studio, storyboard, artifacts."],
    "content-v2": [
      "Content V2",
      "Safer workflow view with explicit stages, disabled reasons, and direct outputs."
    ],
    workflow: ["Workflow", "Queue for ready-gate and approvals."],
    templates: ["Templates", "Template management entrypoint."],
    settings: ["Settings", "Editorial constraints and generation defaults."]
  };
  document.querySelectorAll(".cms-nav-btn").forEach((btn) => {
    const isActive = btn.dataset.section === currentSection;
    btn.dataset.active = isActive ? "true" : "false";
    btn.classList.toggle("active-nav", isActive);
    btn.classList.toggle("bg-stone-900", isActive);
    btn.classList.toggle("text-white", isActive);
    btn.classList.toggle("border-stone-900", isActive);
    if (isActive) {
      btn.style.backgroundColor = "#0f172a";
      btn.style.color = "#f8fafc";
      btn.style.borderColor = "#0f172a";
    } else {
      btn.style.backgroundColor = "";
      btn.style.color = "";
      btn.style.borderColor = "";
    }
  });
  document.querySelectorAll(".cms-panel").forEach((panel) => panel.classList.add("hidden"));
  byId(`panel-${currentSection}`)?.classList.remove("hidden");
  byId("screen-title").textContent = labels[currentSection][0];
  byId("screen-subtitle").textContent = labels[currentSection][1];
}

function renderPipelineSteps() {
  document.querySelectorAll(".workspace-tab-btn").forEach((btn) => {
    const isActive = Number(btn.dataset.pipelineStep) === currentPipelineStep;
    btn.dataset.active = isActive ? "true" : "false";
    btn.classList.toggle("active-tab", isActive);
    btn.classList.toggle("bg-stone-900", isActive);
    btn.classList.toggle("text-white", isActive);
    btn.classList.toggle("border-stone-900", isActive);
    if (isActive) {
      btn.style.backgroundColor = "#0f172a";
      btn.style.color = "#f8fafc";
      btn.style.borderColor = "#0f172a";
    } else {
      btn.style.backgroundColor = "";
      btn.style.color = "";
      btn.style.borderColor = "";
    }
  });
  document.querySelectorAll(".workspace-tab-panel").forEach((panel) => panel.classList.add("hidden"));
  byId(`pipeline-step-${currentPipelineStep}`)?.classList.remove("hidden");
}

function renderRubricFilter() {
  const rubricValues = sortRubrics([...new Set(posts.map((post) => post.rubric).filter(Boolean))]);
  byId("rubric-filter").innerHTML = [
    `<option value="all">All rubrics</option>`,
    ...rubricValues.map(
      (rubric) =>
        `<option value="${escapeHtml(rubric)}">${escapeHtml(
          getRubricDisplayLabel(rubric)
        )}</option>`
    )
  ].join("");
  byId("rubric-filter").value = rubricFilter;
}

function renderTable() {
  const tableBody = byId("posts-table-body");
  const visiblePosts = getVisiblePosts();
  tableBody.innerHTML = "";

  visiblePosts.forEach((post, index) => {
    const tr = document.createElement("tr");
    const isActive = post.postId === selectedPostId;
    tr.className = `cursor-pointer border-b border-stone-200 ${
      isActive ? "bg-amber-50" : "hover:bg-stone-50"
    }`;
    tr.innerHTML = `
      <td class="px-3 py-2 text-stone-600">${index + 1}</td>
      <td class="px-3 py-2 font-medium text-stone-800">${escapeHtml(post.postId)} — ${escapeHtml(
      post.title
    )}</td>
      <td class="px-3 py-2 text-stone-700">${escapeHtml(getRubricDisplayLabel(post.rubric))}</td>
      <td class="px-3 py-2 text-stone-700">${escapeHtml(formatStatusLabel(post.status))}</td>
    `;
    tr.addEventListener("click", () => selectPost(post.postId));
    tableBody.appendChild(tr);
  });

  byId("table-empty").classList.toggle("hidden", visiblePosts.length > 0);
  byId("total-posts").textContent = `Total posts: ${posts.length}`;
}

function renderMeta(post) {
  byId("post-meta").innerHTML = post
    ? `
      <strong>${escapeHtml(post.postId)} — ${escapeHtml(post.title)}</strong><br />
      rubric: ${escapeHtml(getRubricDisplayLabel(post.rubric))}<br />
      format: ${escapeHtml(post.format)}<br />
      visual format: ${escapeHtml(post.visualFormat || "standard carousel")}<br />
      status: ${escapeHtml(formatStatusLabel(post.status))}
    `
    : "Click a post in the table to open workspace.";
}

function renderWorkflowEditor(post) {
  if (!post) {
    byId("status-select").innerHTML = "";
    byId("checklist-editor").innerHTML = "";
    byId("approvals-editor").innerHTML = "";
    return;
  }
  byId("status-select").innerHTML = STATUS_ORDER.map(
    (status) => `<option value="${status}">${formatStatusLabel(status)}</option>`
  ).join("");
  byId("status-select").value = post.status;

  byId("checklist-editor").innerHTML = CHECKLIST_FLAGS.map((flag) => {
    const checked = post.readyChecklist?.[flag] ? "checked" : "";
    return `<label class="flex items-center gap-2"><input type="checkbox" data-checklist-flag="${flag}" ${checked} />${flag}</label>`;
  }).join("");

  byId("approvals-editor").innerHTML = APPROVAL_SECTIONS.map((section) => {
    const options = APPROVAL_STATES.map((state) => {
      const selected = post.approvals?.[section] === state ? "selected" : "";
      return `<option value="${state}" ${selected}>${state}</option>`;
    }).join("");
    return `
      <label class="block text-xs font-medium text-stone-700">${section}</label>
      <select data-approval-section="${section}" class="h-9 w-full rounded border border-stone-300 bg-white px-2 text-xs">
        ${options}
      </select>
    `;
  }).join("");
}

function renderDraftPanels(post) {
  if (!post) {
    byId("brief-source-viewer").value = "";
    byId("rubric-rules-view").textContent = "";
    byId("narrative-draft-viewer").value = "";
    byId("slide-breakdown-viewer").value = "";
    byId("slide-prompts-list").innerHTML = "";
    byId("prompt-assembly-trace").textContent = "";
    byId("narrative-version-list").innerHTML = "";
    byId("prompt-version-list").innerHTML = "";
    byId("variants-history").innerHTML = "";
    resetGeneratedImagePreview();
    return;
  }
  byId("brief-source-viewer").value = currentBundle.post || "";
  byId("rubric-rules-view").innerHTML = getRubricRules(post.rubric)
    .map((rule) => `<div>• ${escapeHtml(rule)}</div>`)
    .join("");
  byId("narrative-draft-viewer").value = [
    `Title: ${post.draft?.copy?.title || ""}`,
    "",
    `One-Line Thesis: ${post.draft?.copy?.oneLineThesis || ""}`,
    "",
    `Caption: ${post.draft?.copy?.caption || ""}`,
    "",
    `CTA: ${post.draft?.copy?.cta || ""}`
  ].join("\n");
  byId("slide-breakdown-viewer").value = buildSlideBreakdown(post, currentBundle.post || "");
  byId("slide-prompts-list").innerHTML = renderSlidePromptCards(
    post,
    currentBundle.post || ""
  );
  byId("prompt-assembly-trace").textContent = buildPromptAssemblyTrace(
    post,
    currentBundle.post || ""
  );

  const variants = post.generation?.variants || [];
  const narrativeVariants = variants.filter((variant) =>
    ["title", "oneLineThesis", "caption", "cta"].includes(variant.target)
  );
  byId("narrative-version-list").innerHTML = narrativeVariants.length
    ? narrativeVariants
        .map(
          (variant) =>
            `<div>${escapeHtml(variant.createdAt || "")} — ${escapeHtml(
              variant.target
            )} — ${escapeHtml(variant.instruction || "")}</div>`
        )
        .join("")
    : '<div class="text-stone-500">No narrative variants yet.</div>';
  const promptVariants = variants.filter((variant) =>
    ["coverPrompt", "slidePrompts"].includes(variant.target)
  );
  byId("prompt-version-list").innerHTML = promptVariants.length
    ? promptVariants
        .map(
          (variant) =>
            `<div>${escapeHtml(variant.createdAt || "")} — ${escapeHtml(
              variant.target
            )} — ${escapeHtml(variant.instruction || "")}</div>`
        )
        .join("")
    : '<div class="text-stone-500">No prompt variants yet.</div>';

  byId("variants-history").innerHTML = variants.length
    ? variants
        .map(
          (variant) => `
      <article class="rounded border border-stone-200 bg-white p-2">
        <div class="text-[11px] text-stone-500">${escapeHtml(variant.createdAt || "")}</div>
        <div class="font-medium text-stone-800">${escapeHtml(variant.target)}</div>
        <div class="truncate text-stone-600">${escapeHtml(variant.instruction || "")}</div>
        <button data-apply-variant="${escapeHtml(
          variant.variantId
        )}" class="mt-2 rounded border border-stone-300 bg-white px-2 py-1 text-[11px] hover:bg-stone-100">
          Apply to draft
        </button>
      </article>`
        )
        .join("")
    : '<div class="text-stone-500">No generated variants yet.</div>';

  resetGeneratedImagePreview();
  autosizeAllTextareas();
}

async function refreshArtifactsAndRuns(postId) {
  const [artifacts, runs] = await Promise.all([
    request(`/api/artifacts/${postId}`),
    request(`/api/generation/runs/${postId}`)
  ]);
  byId("artifacts-list").innerHTML = artifacts.length
    ? artifacts.map((artifact) => `<div>${escapeHtml(artifact)}</div>`).join("")
    : '<div class="text-stone-500">No artifacts yet.</div>';
  byId("runs-list").innerHTML = runs.length
    ? runs
        .slice(0, 20)
        .map(
          (run) =>
            `<div>${escapeHtml(run.startedAt || "")} — ${escapeHtml(run.step || "")} — ${escapeHtml(
              run.status || ""
            )}</div>`
        )
        .join("")
    : '<div class="text-stone-500">No runs yet.</div>';
}

async function selectPost(postId) {
  setFeedback("Loading post workspace...", "loading");
  selectedPostId = postId;
  renderTable();
  contentV2Controller?.refreshFromGlobalState();
  const data = await request(`/api/posts/${postId}`);
  const { post, bundle } = data;
  currentBundle = {
    post: bundle.post || "",
    storyboard: bundle.storyboard || "",
    storyPack: bundle.storyPack || "",
    manifest: bundle.manifest || ""
  };
  posts = posts.map((item) => (item.postId === postId ? post : item));
  renderMeta(post);
  renderWorkflowEditor(post);
  renderDraftPanels(post);
  byId("editorial-tone").value = post.editorial?.tone || "";
  byId("editorial-audience").value = post.editorial?.audience || "";
  byId("editorial-constraints").value = (post.editorial?.constraints || []).join("\n");
  await refreshArtifactsAndRuns(postId);
  autosizeAllTextareas();
  contentV2Controller?.refreshFromGlobalState();
  setFeedback(`Loaded post ${postId}`, "success");
}

async function loadPosts() {
  posts = await request("/api/posts");
  renderRubricFilter();
  renderTable();
  contentV2Controller?.refreshFromGlobalState();
  if (!selectedPostId && posts[0]) {
    await selectPost(posts[0].postId);
  } else if (selectedPostId && !posts.some((post) => post.postId === selectedPostId)) {
    selectedPostId = null;
    renderMeta(null);
  }
}

async function loadDashboard() {
  const data = await request("/api/cms/dashboard");
  byId("dashboard-total").textContent = String(data.totalPosts || 0);
  byId("dashboard-blocked").textContent = String(data.blockedByChecklist || 0);
  const statusEntries = Object.entries(data.byStatus || {}).sort((a, b) => {
    const aIndex = STATUS_ORDER.indexOf(a[0]);
    const bIndex = STATUS_ORDER.indexOf(b[0]);
    return aIndex - bIndex;
  });
  byId("dashboard-status-mix").innerHTML = statusEntries.length
    ? statusEntries
        .map(
          ([status, count]) => `<div>${escapeHtml(formatStatusLabel(status))}: ${count}</div>`
        )
        .join("")
    : "<div>No data</div>";
  byId("dashboard-runs").innerHTML = (data.recentRuns || []).length
    ? data.recentRuns
        .map(
          (run) =>
            `<div>${escapeHtml(run.startedAt)} — ${escapeHtml(run.postId)} — ${escapeHtml(
              run.step
            )}</div>`
        )
        .join("")
    : "<div>No runs yet.</div>";
}

async function loadWorkflowQueue() {
  const queue = await request("/api/workflow/queue");
  byId("workflow-queue").innerHTML = queue.length
    ? queue
        .map(
          (item) => `
      <article class="mb-2 rounded border border-stone-200 bg-stone-50 p-2">
        <div class="font-medium">${escapeHtml(item.postId)} — ${escapeHtml(item.title)}</div>
        <div class="text-xs text-stone-600">status: ${escapeHtml(
          formatStatusLabel(item.status)
        )}</div>
        <div class="text-xs text-stone-600">missing: ${escapeHtml(item.missingChecklistFlags.join(", ") || "none")}</div>
      </article>`
        )
        .join("")
    : "<div>No pending items. Workflow queue is empty.</div>";
}

function wireStaticOptions() {
  byId("ai-target").innerHTML = AI_TARGETS.map((target) => `<option value="${target}">${target}</option>`).join("");
}

function wireEvents() {
  document.body.addEventListener("click", async (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (actionBtn?.dataset.action === "rebuild-index") {
      setFeedback("Rebuilding index...", "loading");
      await request("/api/index/rebuild", { method: "POST" });
      await loadPosts();
      await loadDashboard();
      await loadWorkflowQueue();
      setFeedback("Index rebuilt", "success");
      return;
    }

    const navBtn = event.target.closest("[data-section]");
    if (navBtn) {
      currentSection = navBtn.dataset.section;
      renderNav();
      if (currentSection === "dashboard") await loadDashboard();
      if (currentSection === "content-v2") {
        await contentV2Controller?.onSectionActivated();
      }
      if (currentSection === "workflow") await loadWorkflowQueue();
      return;
    }
    const tabBtn = event.target.closest("[data-pipeline-step]");
    if (tabBtn) {
      currentPipelineStep = Number(tabBtn.dataset.pipelineStep);
      renderPipelineSteps();
      return;
    }
    const applyBtn = event.target.closest("[data-apply-variant]");
    if (applyBtn) {
      const post = getSelectedPost();
      if (!post) {
        setFeedback("Select a post first", "error");
        return;
      }
      const variantId = applyBtn.getAttribute("data-apply-variant");
      setFeedback("Applying variant to draft...", "loading");
      await request("/api/content/apply", {
        method: "POST",
        body: JSON.stringify({ postId: post.postId, variantId })
      });
      await selectPost(post.postId);
      await loadWorkflowQueue();
      setFeedback("Variant applied. Checklist flags were reset for review.", "success");
      return;
    }

    const slideImageBtn = event.target.closest("[data-generate-slide-image]");
    if (slideImageBtn) {
      const post = getSelectedPost();
      if (!post) {
        setFeedback("Select a post first", "error");
        return;
      }
      const slideIndex = Number(slideImageBtn.getAttribute("data-generate-slide-image"));
      const promptField = document.querySelector(`[data-slide-prompt="${slideIndex}"]`);
      const prompt = promptField?.value?.trim() || "";
      if (!prompt) {
        setFeedback("Build slide prompts first", "error");
        return;
      }
      const slideLabel = `Slide ${slideCode(slideIndex)}`;
      setFeedback(`Generating image for ${slideLabel}...`, "loading");
      const payload = await request("/api/images/generate", {
        method: "POST",
        body: JSON.stringify({
          postId: post.postId,
          prompt,
          model: byId("fal-model").value,
          assetKey: `slide-${slideCode(slideIndex)}`,
          label: slideLabel
        })
      });
      showGeneratedImagePreview(payload.image);
      await refreshArtifactsAndRuns(post.postId);
      setFeedback(`${slideLabel} image generated and saved locally`, "success");
      return;
    }
  });

  byId("search-input").addEventListener("input", (event) => {
    searchQuery = event.target.value || "";
    renderTable();
  });

  byId("rubric-filter").addEventListener("change", (event) => {
    rubricFilter = event.target.value || "all";
    renderTable();
  });

  document.body.addEventListener("input", (event) => {
    const textarea = event.target.closest("textarea");
    if (!textarea) return;
    autosizeTextarea(textarea);
  });

  byId("generate-narrative-btn").addEventListener("click", async () => {
    const post = getSelectedPost();
    if (!post) {
      setFeedback("Select a post first", "error");
      return;
    }
    setFeedback("Generating narrative variant...", "loading");
    await request("/api/content/generate", {
      method: "POST",
      body: JSON.stringify({
        postId: post.postId,
        target: "oneLineThesis",
        instruction: "Generate narrative from brief and rubric rules"
      })
    });
    await selectPost(post.postId);
    setFeedback("Narrative variant generated", "success");
  });

  byId("ai-generate-btn").addEventListener("click", async () => {
    const post = getSelectedPost();
    if (!post) {
      setFeedback("Select a post first", "error");
      return;
    }
    setFeedback("Generating content variant...", "loading");
    const payload = await request("/api/content/generate", {
      method: "POST",
      body: JSON.stringify({
        postId: post.postId,
        target: byId("ai-target").value,
        instruction: byId("ai-instruction").value
      })
    });
    byId("variant-preview").value = formatJson(payload.variant || {});
    await selectPost(post.postId);
    await loadDashboard();
    setFeedback("Variant generated and stored in history", "success");
  });

  byId("generate-image-prompt-btn").addEventListener("click", () => {
    const post = getSelectedPost();
    if (!post) {
      setFeedback("Select a post first", "error");
      return;
    }
    byId("slide-prompts-list").innerHTML = renderSlidePromptCards(
      post,
      currentBundle.post || ""
    );
    autosizeAllTextareas();
    setFeedback("Slide prompts built", "success");
  });

  byId("approve-narrative-btn").addEventListener("click", async () => {
    const post = getSelectedPost();
    if (!post) return;
    await request(`/api/posts/${post.postId}/approvals`, {
      method: "PATCH",
      body: JSON.stringify({
        section: "brief",
        state: "approved"
      })
    });
    await request(`/api/posts/${post.postId}/checklist`, {
      method: "PATCH",
      body: JSON.stringify({
        readyChecklist: {
          copyApproved: true
        }
      })
    });
    await selectPost(post.postId);
    setFeedback("Narrative approved", "success");
  });

  byId("approve-slides-btn").addEventListener("click", async () => {
    const post = getSelectedPost();
    if (!post) return;
    await request(`/api/posts/${post.postId}/approvals`, {
      method: "PATCH",
      body: JSON.stringify({
        section: "storyboard",
        state: "approved"
      })
    });
    await selectPost(post.postId);
    setFeedback("Slides approved", "success");
  });

  byId("approve-prompts-btn").addEventListener("click", async () => {
    const post = getSelectedPost();
    if (!post) return;
    await request(`/api/posts/${post.postId}/checklist`, {
      method: "PATCH",
      body: JSON.stringify({
        readyChecklist: {
          promptsReady: true
        }
      })
    });
    await selectPost(post.postId);
    setFeedback("Prompts approved", "success");
  });

  byId("save-status-btn").addEventListener("click", async () => {
    const post = getSelectedPost();
    if (!post) {
      setFeedback("Select a post first", "error");
      return;
    }
    const status = byId("status-select").value;
    setFeedback("Updating status...", "loading");
    await request(`/api/posts/${post.postId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    await loadPosts();
    await selectPost(post.postId);
    await loadDashboard();
    await loadWorkflowQueue();
    setFeedback("Status updated", "success");
  });

  byId("checklist-editor").addEventListener("change", async (event) => {
    const input = event.target.closest("[data-checklist-flag]");
    if (!input) return;
    const post = getSelectedPost();
    if (!post) return;
    const flag = input.getAttribute("data-checklist-flag");
    await request(`/api/posts/${post.postId}/checklist`, {
      method: "PATCH",
      body: JSON.stringify({
        readyChecklist: {
          [flag]: input.checked
        }
      })
    });
    await loadPosts();
    await selectPost(post.postId);
    await loadDashboard();
    await loadWorkflowQueue();
  });

  byId("approvals-editor").addEventListener("change", async (event) => {
    const select = event.target.closest("[data-approval-section]");
    if (!select) return;
    const post = getSelectedPost();
    if (!post) return;
    await request(`/api/posts/${post.postId}/approvals`, {
      method: "PATCH",
      body: JSON.stringify({
        section: select.getAttribute("data-approval-section"),
        state: select.value
      })
    });
    await loadPosts();
    await selectPost(post.postId);
    await loadWorkflowQueue();
  });

  byId("save-editorial-btn").addEventListener("click", async () => {
    const post = getSelectedPost();
    if (!post) {
      setFeedback("Select a post first", "error");
      return;
    }
    const constraints = byId("editorial-constraints")
      .value.split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    setFeedback("Saving editorial settings...", "loading");
    await request(`/api/posts/${post.postId}/editorial`, {
      method: "PATCH",
      body: JSON.stringify({
        editorial: {
          tone: byId("editorial-tone").value,
          audience: byId("editorial-audience").value,
          constraints
        }
      })
    });
    await loadPosts();
    await selectPost(post.postId);
    setFeedback("Editorial settings updated", "success");
  });
}

async function bootstrap() {
  contentV2Controller = createContentV2Controller({
    request,
    byId,
    escapeHtml,
    formatStatusLabel,
    setFeedback,
    autosizeAllTextareas,
    getPosts: () => posts,
    getSelectedPostId: () => selectedPostId,
    selectLegacyPost: selectPost,
    refreshPostState: async (postId) => {
      await loadPosts();
      await selectPost(postId);
      await loadDashboard();
      await loadWorkflowQueue();
    }
  });
  wireStaticOptions();
  renderNav();
  renderPipelineSteps();
  wireEvents();
  contentV2Controller.wireEvents();
  setFeedback("Loading CMS data...", "loading");
  await Promise.all([loadPosts(), loadDashboard(), loadWorkflowQueue()]);
  autosizeAllTextareas();
  const v2Params = new URLSearchParams(window.location.search);
  const deepLinkPost = v2Params.get("v2Post");
  const deepLinkStage = v2Params.get("v2Stage");
  if (deepLinkPost) {
    currentSection = "content-v2";
    renderNav();
    try {
      await contentV2Controller.openFromUrl(deepLinkPost, deepLinkStage);
    } catch (error) {
      setFeedback(`Content V2 link could not load: ${error.message}`, "error");
    }
  } else {
    setFeedback("CMS is ready", "success");
  }
}

bootstrap().catch((error) => {
  setFeedback(`Startup error: ${error.message}`, "error");
});
