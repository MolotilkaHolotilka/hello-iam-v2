import {
  getRubricDisplayLabel,
  sortRubrics
} from "./rubric-registry.js";

function badgeClasses(state) {
  const map = {
    blocked: "border-red-200 bg-red-50 text-red-700",
    available: "border-amber-200 bg-amber-50 text-amber-700",
    ready_for_review: "border-sky-200 bg-sky-50 text-sky-700",
    complete: "border-emerald-200 bg-emerald-50 text-emerald-700",
    approved: "border-emerald-200 bg-emerald-50 text-emerald-700"
  };
  return map[state] || "border-stone-200 bg-stone-50 text-stone-700";
}

function badgeLabel(state) {
  const map = {
    blocked: "Blocked",
    available: "Available",
    ready_for_review: "Ready for review",
    complete: "Complete",
    approved: "Approved"
  };
  return map[state] || state;
}

function renderButton({
  actionKey,
  label,
  enabled,
  disabledReason,
  actionStates
}) {
  const actionState = actionStates[actionKey] || null;
  const isLoading = actionState?.status === "loading";
  const isDisabled = !enabled || isLoading;
  const toneClass =
    actionState?.status === "error"
      ? "border-red-300 text-red-700"
      : actionState?.status === "success"
        ? "border-emerald-300 text-emerald-700"
        : "border-stone-300 text-stone-800";
  return `
    <div class="flex flex-col gap-1">
      <button
        data-v2-action="${actionKey}"
        ${isDisabled ? "disabled" : ""}
        class="min-h-10 rounded-lg border bg-white px-4 text-sm transition ${
          isDisabled ? "cursor-not-allowed opacity-50" : "hover:bg-stone-100"
        } ${toneClass}"
      >
        ${isLoading ? "Working..." : label}
      </button>
      ${
        actionState?.message
          ? `<div class="text-[11px] ${
              actionState.status === "error"
                ? "text-red-700"
                : actionState.status === "success"
                  ? "text-emerald-700"
                  : "text-amber-700"
            }">${actionState.message}</div>`
          : disabledReason && !enabled
            ? `<div class="text-[11px] text-stone-500">${disabledReason}</div>`
            : ""
      }
    </div>
  `;
}

function renderTextBlock(title, value, escapeHtml) {
  return `
    <div class="rounded-lg border border-stone-200 bg-white p-3">
      <div class="text-[11px] uppercase tracking-wide text-stone-500">${escapeHtml(
        title
      )}</div>
      <div class="mt-2 whitespace-pre-wrap text-sm text-stone-800">${escapeHtml(
        value || "—"
      )}</div>
    </div>
  `;
}

function truncateText(value, maxLength = 140) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "No content yet.";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}...`;
}

function renderPromptDisclosure({
  title,
  promptText,
  escapeHtml,
  textareaAttrs = "",
  previewLength = 140
}) {
  if (!promptText) {
    return `
      <div class="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3 text-sm text-stone-500">
        No prompt available yet.
      </div>
    `;
  }
  return `
    <details class="rounded-lg border border-stone-200 bg-white">
      <summary class="cursor-pointer px-3 py-2 text-sm font-medium text-stone-800">
        ${escapeHtml(title)}
        <div class="mt-1 pr-6 text-xs font-normal text-stone-500">${escapeHtml(
          truncateText(promptText, previewLength)
        )}</div>
      </summary>
      <div class="border-t border-stone-200 p-3">
        <textarea readonly ${textareaAttrs} class="min-h-[140px] w-full rounded-lg border border-stone-300 bg-stone-50 p-2 font-mono text-xs">${escapeHtml(
          promptText
        )}</textarea>
      </div>
    </details>
  `;
}

function renderChecklistItems(items, escapeHtml) {
  return items
    .map(
      (item) => `
        <div class="flex items-start gap-2 rounded-lg border ${
          item.value ? "border-emerald-200 bg-emerald-50" : "border-stone-200 bg-white"
        } p-2">
          <div class="mt-[2px] h-2.5 w-2.5 rounded-full ${
            item.value ? "bg-emerald-500" : "bg-stone-300"
          }"></div>
          <div>
            <div class="text-sm text-stone-800">${escapeHtml(item.label)}</div>
            <div class="text-[11px] text-stone-500">Stage: ${escapeHtml(item.stageId)}</div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderNarrativeStage(workspace, actionStates, escapeHtml) {
  const stage = workspace.stages.find((item) => item.id === "narrative");
  const narrative = workspace.narrative.current;
  return `
    <article class="rounded-xl border border-stone-300 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="text-base font-semibold text-stone-900">${stage.title}</h4>
            <span class="rounded-full border px-2 py-1 text-[11px] ${badgeClasses(
              stage.state
            )}">${badgeLabel(stage.state)}</span>
            <span class="rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] text-stone-600">${escapeHtml(
              workspace.narrative.source
            )}</span>
          </div>
          <p class="mt-1 text-sm text-stone-600">${escapeHtml(stage.summary)}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          ${renderButton({
            actionKey: "narrative-generate",
            label: "Generate Narrative Draft",
            enabled: stage.actions.generate.enabled,
            disabledReason: stage.actions.generate.disabledReason,
            actionStates
          })}
          ${renderButton({
            actionKey: "narrative-approve",
            label: "Approve Narrative",
            enabled: stage.actions.approve.enabled,
            disabledReason: stage.actions.approve.disabledReason,
            actionStates
          })}
        </div>
      </div>
      <div class="mt-4 grid gap-3 lg:grid-cols-2">
        ${renderTextBlock("Title", narrative.title, escapeHtml)}
        ${renderTextBlock("One-Line Thesis", narrative.oneLineThesis, escapeHtml)}
        ${renderTextBlock("Caption", narrative.caption, escapeHtml)}
        ${renderTextBlock("CTA", narrative.cta, escapeHtml)}
      </div>
    </article>
  `;
}

function renderSlidesStage(workspace, actionStates, escapeHtml) {
  const stage = workspace.stages.find((item) => item.id === "slides");
  const slides = workspace.slides.current;
  return `
    <article class="rounded-xl border border-stone-300 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="text-base font-semibold text-stone-900">${stage.title}</h4>
            <span class="rounded-full border px-2 py-1 text-[11px] ${badgeClasses(
              stage.state
            )}">${badgeLabel(stage.state)}</span>
            <span class="rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] text-stone-600">${escapeHtml(
              workspace.slides.source
            )}</span>
          </div>
          <p class="mt-1 text-sm text-stone-600">${escapeHtml(stage.summary)}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          ${renderButton({
            actionKey: "slides-generate",
            label: "Sync Slides Into Draft",
            enabled: stage.actions.generate.enabled,
            disabledReason: stage.actions.generate.disabledReason,
            actionStates
          })}
          ${renderButton({
            actionKey: "slides-approve",
            label: "Approve Slides",
            enabled: stage.actions.approve.enabled,
            disabledReason: stage.actions.approve.disabledReason,
            actionStates
          })}
        </div>
      </div>
      <div class="mt-4 space-y-2">
        ${
          slides.length
            ? slides
                .map(
                  (slide) => `
                    <div class="rounded-lg border border-stone-200 bg-stone-50 p-3">
                      <div class="text-[11px] uppercase tracking-wide text-stone-500">Slide ${String(
                        slide.index
                      ).padStart(2, "0")}</div>
                      <div class="mt-1 text-sm text-stone-800">${escapeHtml(slide.text)}</div>
                    </div>
                  `
                )
                .join("")
            : '<div class="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3 text-sm text-stone-500">No slide text available yet.</div>'
        }
      </div>
    </article>
  `;
}

function renderPromptsStage(workspace, actionStates, escapeHtml) {
  const stage = workspace.stages.find((item) => item.id === "prompts");
  const prompts = workspace.prompts.current;
  return `
    <article class="rounded-xl border border-stone-300 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="text-base font-semibold text-stone-900">${stage.title}</h4>
            <span class="rounded-full border px-2 py-1 text-[11px] ${badgeClasses(
              stage.state
            )}">${badgeLabel(stage.state)}</span>
            <span class="rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] text-stone-600">${escapeHtml(
              workspace.prompts.source
            )}</span>
          </div>
          <p class="mt-1 text-sm text-stone-600">${escapeHtml(stage.summary)}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          ${renderButton({
            actionKey: "prompts-generate",
            label: "Build Prompts From Slides",
            enabled: stage.actions.generate.enabled,
            disabledReason: stage.actions.generate.disabledReason,
            actionStates
          })}
          ${renderButton({
            actionKey: "prompts-approve",
            label: "Approve Prompts",
            enabled: stage.actions.approve.enabled,
            disabledReason: stage.actions.approve.disabledReason,
            actionStates
          })}
        </div>
      </div>
      <div class="mt-4 space-y-3">
        ${renderPromptDisclosure({
          title: "Cover Prompt",
          promptText: prompts.coverPrompt,
          escapeHtml,
          previewLength: 180
        })}
        <div class="grid gap-3 xl:grid-cols-2">
          ${prompts.slidePrompts
            .map(
              (item) =>
                renderPromptDisclosure({
                  title: `Slide ${String(item.index).padStart(2, "0")} Prompt`,
                  promptText: item.text,
                  escapeHtml
                })
            )
            .join("")}
        </div>
      </div>
    </article>
  `;
}

function renderImageResultLinks(item) {
  return `
    <div class="mt-2 flex flex-wrap gap-2 text-[11px]">
      ${
        item.sourceUrl
          ? `<a class="rounded-lg border border-stone-300 bg-white px-2 py-1 hover:bg-stone-100" href="${item.sourceUrl}" target="_blank" rel="noreferrer">Open fal result</a>`
          : ""
      }
      ${
        item.localUrl
          ? `<a class="rounded-lg border border-stone-300 bg-white px-2 py-1 hover:bg-stone-100" href="${item.localUrl}" target="_blank" rel="noreferrer">Open local copy</a>`
          : ""
      }
    </div>
  `;
}

function renderImagePreview(item, escapeHtml) {
  const src = item.sourceUrl || item.localUrl || "";
  if (!src) return "";
  return `
    <img
      src="${escapeHtml(src)}"
      alt="${escapeHtml(item.label || "Generated image")}"
      loading="lazy"
      class="mt-3 max-h-56 w-full rounded-lg border border-stone-200 object-cover"
    />
  `;
}

function renderImagesStage(workspace, actionStates, escapeHtml) {
  const stage = workspace.stages.find((item) => item.id === "images");
  const grouped = workspace.images.bySlide;
  const uncategorized = workspace.images.uncategorized || [];
  return `
    <article class="rounded-xl border border-stone-300 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="text-base font-semibold text-stone-900">${stage.title}</h4>
            <span class="rounded-full border px-2 py-1 text-[11px] ${badgeClasses(
              stage.state
            )}">${badgeLabel(stage.state)}</span>
          </div>
          <p class="mt-1 text-sm text-stone-600">${escapeHtml(stage.summary)}</p>
        </div>
        <div class="min-w-[240px]">
          <label for="v2-fal-model" class="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-600">fal.ai model</label>
          <input
            id="v2-fal-model"
            type="text"
            value="${escapeHtml(workspace.prompts.modelDefault)}"
            class="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
          />
        </div>
      </div>
      <div class="mt-4 space-y-3">
        ${
          uncategorized.length
            ? `
              <div class="rounded-lg border border-stone-200 bg-white p-3">
                <div class="text-sm font-semibold text-stone-900">Recent Unassigned Results</div>
                <div class="mt-1 text-xs text-stone-500">
                  Older image runs without slide metadata still render here so they are visible immediately.
                </div>
                <div class="mt-3 grid gap-3 xl:grid-cols-3">
                  ${uncategorized
                    .slice(0, 6)
                    .map(
                      (item) => `
                        <div class="rounded-lg border border-stone-200 bg-stone-50 p-3">
                          <div class="text-sm text-stone-800">${escapeHtml(item.label)}</div>
                          <div class="text-[11px] text-stone-500">${escapeHtml(item.createdAt)}</div>
                          ${renderImagePreview(item, escapeHtml)}
                          ${renderImageResultLinks(item)}
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </div>
            `
            : ""
        }
        <div class="grid gap-3 xl:grid-cols-2">
        ${grouped
          .map((group) => {
            const prompt = workspace.prompts.current.slidePrompts.find(
              (item) => item.index === group.slideIndex
            );
            const latest = group.items[0] || null;
            return `
              <div class="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div class="text-sm font-semibold text-stone-900">Slide ${String(
                      group.slideIndex
                    ).padStart(2, "0")}</div>
                    <div class="mt-1 text-xs text-stone-600">${escapeHtml(
                      group.slideText
                    )}</div>
                  </div>
                  ${renderButton({
                    actionKey: `image-generate-${group.slideIndex}`,
                    label: "Generate Image",
                    enabled: stage.actions.generate.enabled && Boolean(prompt?.text),
                    disabledReason: prompt?.text
                      ? stage.actions.generate.disabledReason
                      : "Build prompts first.",
                    actionStates
                  })}
                </div>
                <div class="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div class="space-y-3">
                    ${renderPromptDisclosure({
                      title: "Prompt",
                      promptText: prompt?.text || "",
                      escapeHtml,
                      textareaAttrs: `data-v2-slide-prompt="${group.slideIndex}"`,
                      previewLength: 120
                    })}
                  </div>
                  <div class="rounded-lg border border-stone-200 bg-white p-3">
                    <div class="text-[11px] uppercase tracking-wide text-stone-500">Latest Result</div>
                    ${
                      latest
                        ? `
                          <div class="mt-1 text-sm text-stone-800">${escapeHtml(
                            latest.label
                          )}</div>
                          <div class="text-[11px] text-stone-500">${escapeHtml(
                            latest.createdAt
                          )}</div>
                          ${renderImagePreview(latest, escapeHtml)}
                          ${renderImageResultLinks(latest)}
                        `
                        : '<div class="mt-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3 text-sm text-stone-500">No image generated for this slide yet.</div>'
                    }
                  </div>
                </div>
              </div>
            `;
          })
          .join("")}
        </div>
      </div>
    </article>
  `;
}

function renderExportStage(workspace, actionStates, escapeHtml) {
  const stage = workspace.stages.find((item) => item.id === "export");
  const groupedItems = workspace.images.bySlide.some((group) => group.items.length > 0)
    ? workspace.images.bySlide
        .filter((group) => group.items.length > 0)
        .map(
          (group) => `
            <div class="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div class="text-sm font-semibold text-stone-900">Slide ${String(
                group.slideIndex
              ).padStart(2, "0")}</div>
              <div class="mt-2 space-y-2">
                ${group.items
                  .map(
                    (item) => `
                      <div class="rounded-lg border border-stone-200 bg-white p-3">
                        <div class="text-sm text-stone-800">${escapeHtml(
                          item.label
                        )}</div>
                        <div class="text-[11px] text-stone-500">${escapeHtml(
                          item.createdAt
                        )}</div>
                        ${renderImagePreview(item, escapeHtml)}
                        ${renderImageResultLinks(item)}
                      </div>
                    `
                  )
                  .join("")}
              </div>
            </div>
          `
        )
        .join("")
    : "";
  const uncategorizedItems = workspace.images.uncategorized.length
    ? `
      <div class="rounded-lg border border-stone-200 bg-stone-50 p-3">
        <div class="text-sm font-semibold text-stone-900">Unassigned Results</div>
        <div class="mt-1 text-xs text-stone-500">
          Older image runs without slide metadata are still available here so nothing gets lost.
        </div>
        <div class="mt-2 space-y-2">
          ${workspace.images.uncategorized
            .map(
              (item) => `
                <div class="rounded-lg border border-stone-200 bg-white p-3">
                  <div class="text-sm text-stone-800">${escapeHtml(item.label)}</div>
                  <div class="text-[11px] text-stone-500">${escapeHtml(item.createdAt)}</div>
                  ${renderImagePreview(item, escapeHtml)}
                  ${renderImageResultLinks(item)}
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    `
    : "";
  return `
    <article class="rounded-xl border border-stone-300 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="text-base font-semibold text-stone-900">${stage.title}</h4>
            <span class="rounded-full border px-2 py-1 text-[11px] ${badgeClasses(
              stage.state
            )}">${badgeLabel(stage.state)}</span>
          </div>
          <p class="mt-1 text-sm text-stone-600">${escapeHtml(stage.summary)}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          ${renderButton({
            actionKey: "export-approve",
            label: "Mark Export Ready",
            enabled: stage.actions.approve.enabled,
            disabledReason: stage.actions.approve.disabledReason,
            actionStates
          })}
        </div>
      </div>
      <div class="mt-4 space-y-3">
        ${
          groupedItems || uncategorizedItems
            ? `${groupedItems}${uncategorizedItems}`
            : '<div class="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3 text-sm text-stone-500">No exportable images yet.</div>'
        }
      </div>
    </article>
  `;
}

function renderBriefStage(workspace, escapeHtml) {
  const stage = workspace.stages.find((item) => item.id === "brief");
  return `
    <article class="rounded-xl border border-stone-300 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="text-base font-semibold text-stone-900">${stage.title}</h4>
            <span class="rounded-full border px-2 py-1 text-[11px] ${badgeClasses(
              stage.state
            )}">${badgeLabel(stage.state)}</span>
            <span class="rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] text-stone-600">${escapeHtml(
              workspace.brief.source
            )}</span>
          </div>
          <p class="mt-1 text-sm text-stone-600">${escapeHtml(stage.summary)}</p>
        </div>
        <div class="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
          ${escapeHtml(workspace.post.paths.post || "No linked file")}
        </div>
      </div>
      <textarea readonly class="mt-4 min-h-[260px] w-full rounded-lg border border-stone-300 bg-stone-50 p-3 font-mono text-xs">${escapeHtml(
        workspace.brief.markdown || ""
      )}</textarea>
    </article>
  `;
}

function renderDetailChips(workspace, escapeHtml, formatStatusLabel) {
  return `
        <span class="rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-700">${escapeHtml(
          getRubricDisplayLabel(workspace.post.rubric)
        )}</span>
        <span class="rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-700">${escapeHtml(
          workspace.post.format
        )}</span>
        <span class="rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-700">${escapeHtml(
          workspace.post.visualFormat || "standard carousel"
        )}</span>
        <span class="rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-700">${escapeHtml(
          formatStatusLabel(workspace.workflow.trackerStatus)
        )}</span>
  `;
}

function renderMetadataPanel(workspace, escapeHtml) {
  const rows = [
    ["Rubric", getRubricDisplayLabel(workspace.post.rubric || "—")],
    ["Format", workspace.post.format || "—"],
    ["Visual format", workspace.post.visualFormat || "standard carousel"],
    ["Category", workspace.post.category || "—"],
    ["Priority", workspace.post.priority || "—"],
    ["Brief path", workspace.post.paths.post || "—"],
    ["Image assets", String(workspace.images.total || 0)]
  ];
  return `
    <div class="grid gap-2">
      ${rows
        .map(
          ([label, value]) => `
            <div class="rounded-lg border border-stone-200 bg-white px-3 py-2">
              <div class="text-[11px] uppercase tracking-wide text-stone-500">${escapeHtml(
                label
              )}</div>
              <div class="mt-1 text-sm text-stone-800">${escapeHtml(value)}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderStageMenu(workspace, activeStageId, escapeHtml) {
  const panelId = "v2-stage-panel";
  return workspace.stages
    .map((stage) => {
      const isActive = stage.id === activeStageId;
      const tabId = `v2-stage-tab-${stage.id}`;
      return `
        <button
          type="button"
          role="tab"
          id="${tabId}"
          data-v2-stage-tab="${stage.id}"
          aria-selected="${isActive ? "true" : "false"}"
          aria-controls="${panelId}"
          tabindex="${isActive ? "0" : "-1"}"
          class="shrink-0 rounded-lg border px-3 py-2 text-left text-sm transition ${
            isActive
              ? "border-stone-900 bg-stone-900 text-white"
              : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
          }"
        >
          <div class="whitespace-nowrap font-medium">${escapeHtml(stage.title)}</div>
          <div class="mt-1 whitespace-nowrap text-[11px] ${
            isActive ? "text-stone-300" : "text-stone-500"
          }">${escapeHtml(badgeLabel(stage.state))}</div>
        </button>
      `;
    })
    .join("");
}

function renderSelectedStage(workspace, activeStageId, actionStates, escapeHtml) {
  switch (activeStageId) {
    case "narrative":
      return renderNarrativeStage(workspace, actionStates, escapeHtml);
    case "slides":
      return renderSlidesStage(workspace, actionStates, escapeHtml);
    case "prompts":
      return renderPromptsStage(workspace, actionStates, escapeHtml);
    case "images":
      return renderImagesStage(workspace, actionStates, escapeHtml);
    case "export":
      return renderExportStage(workspace, actionStates, escapeHtml);
    case "brief":
    default:
      return renderBriefStage(workspace, escapeHtml);
  }
}

export function createContentV2Controller({
  request,
  byId,
  escapeHtml,
  formatStatusLabel,
  setFeedback,
  autosizeAllTextareas,
  getPosts,
  getSelectedPostId,
  selectLegacyPost,
  refreshPostState
}) {
  let searchQuery = "";
  let rubricFilter = "all";
  let workspace = null;
  let actionStates = {};
  let viewMode = "list";
  let activeStageId = "brief";
  let listScrollTop = 0;
  let postListKeydownWired = false;

  function saveListScrollPosition() {
    const el = byId("v2-list-table-scroll");
    if (el) listScrollTop = el.scrollTop;
  }

  function restoreListScrollPosition() {
    const el = byId("v2-list-table-scroll");
    if (el) el.scrollTop = listScrollTop;
  }

  function syncV2Url() {
    const url = new URL(window.location.href);
    if (viewMode === "detail" && workspace) {
      url.searchParams.set("v2Post", workspace.post.postId);
      url.searchParams.set("v2Stage", activeStageId);
    } else {
      url.searchParams.delete("v2Post");
      url.searchParams.delete("v2Stage");
    }
    const next = `${url.pathname}${url.search}${url.hash}`;
    const curr = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== curr) {
      history.replaceState({}, "", next);
    }
  }

  function visiblePosts() {
    return getPosts().filter((post) => {
      const matchesRubric = rubricFilter === "all" || post.rubric === rubricFilter;
      if (!matchesRubric) return false;
      const haystack = `${post.postId} ${post.title}`.toLowerCase();
      return haystack.includes(searchQuery.toLowerCase());
    });
  }

  function renderPostList() {
    const tableBody = byId("v2-posts-table-body");
    const posts = visiblePosts();
    tableBody.innerHTML = "";
    posts.forEach((post, index) => {
      const tr = document.createElement("tr");
      const isActive = post.postId === getSelectedPostId();
      tr.className = `cursor-pointer border-b border-stone-200 outline-none focus-visible:bg-stone-100 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset ${
        isActive ? "bg-amber-50" : "hover:bg-stone-50"
      }`;
      tr.tabIndex = 0;
      tr.setAttribute("role", "button");
      tr.dataset.v2PostId = post.postId;
      tr.innerHTML = `
        <td class="px-3 py-2 text-stone-600">${index + 1}</td>
        <td class="px-3 py-2 font-medium text-stone-800">${escapeHtml(
          post.postId
        )} — ${escapeHtml(post.title)}</td>
        <td class="px-3 py-2 text-stone-700">${escapeHtml(
          getRubricDisplayLabel(post.rubric || "—")
        )}</td>
        <td class="px-3 py-2 text-stone-700">
          <div>${escapeHtml(post.format || "—")}</div>
          <div class="text-xs text-stone-500">${escapeHtml(
            post.visualFormat || "standard carousel"
          )}</div>
        </td>
        <td class="px-3 py-2 text-stone-700">${escapeHtml(
          formatStatusLabel(post.status)
        )}</td>
      `;
      tr.addEventListener("click", () => {
        loadWorkspace(post.postId).catch((error) => {
          setFeedback(`Content V2 error: ${error.message}`, "error");
        });
      });
      tableBody.appendChild(tr);
    });
    byId("v2-table-empty").classList.toggle("hidden", posts.length > 0);
  }

  function pickDefaultStageId(nextWorkspace) {
    return (
      nextWorkspace?.stages?.find(
        (stage) => !["approved", "complete"].includes(stage.state)
      )?.id ||
      nextWorkspace?.stages?.[nextWorkspace.stages.length - 1]?.id ||
      "brief"
    );
  }

  function renderRubricFilter() {
    const values = sortRubrics([...new Set(getPosts().map((post) => post.rubric).filter(Boolean))]);
    byId("v2-rubric-filter").innerHTML = [
      `<option value="all">All rubrics</option>`,
      ...values.map(
        (rubric) =>
          `<option value="${escapeHtml(rubric)}">${escapeHtml(
            getRubricDisplayLabel(rubric)
          )}</option>`
      )
    ].join("");
    byId("v2-rubric-filter").value = rubricFilter;
  }

  function setActionState(key, status, message = "") {
    actionStates[key] = { status, message };
    render();
  }

  function clearActionState(key) {
    delete actionStates[key];
    render();
  }

  function resetActionStates() {
    actionStates = {};
  }

  function showListView() {
    viewMode = "list";
    render();
    requestAnimationFrame(() => restoreListScrollPosition());
  }

  function render() {
    renderRubricFilter();
    renderPostList();
    const listPageEl = byId("v2-list-page");
    const detailPageEl = byId("v2-detail-page");
    const workspaceEl = byId("v2-workspace");
    const emptyEl = byId("v2-empty-state");
    listPageEl.classList.toggle("hidden", viewMode !== "list");
    detailPageEl.classList.toggle("hidden", viewMode !== "detail");

    if (viewMode === "list") {
      syncV2Url();
      return;
    }

    if (!workspace) {
      workspaceEl.classList.add("hidden");
      emptyEl.classList.remove("hidden");
      byId("v2-detail-title").textContent = "";
      byId("v2-detail-chips").innerHTML = "";
      byId("v2-post-meta").innerHTML = "";
      byId("v2-stage-menu").innerHTML = "";
      byId("v2-stage-panel").innerHTML = "";
      byId("v2-stage-panel").removeAttribute("aria-labelledby");
      syncV2Url();
      return;
    }

    if (!workspace.stages.some((stage) => stage.id === activeStageId)) {
      activeStageId = pickDefaultStageId(workspace);
    }
    emptyEl.classList.add("hidden");
    workspaceEl.classList.remove("hidden");
    byId("v2-detail-title").textContent = `${workspace.post.postId} — ${workspace.post.title}`;
    byId("v2-detail-chips").innerHTML = renderDetailChips(
      workspace,
      escapeHtml,
      formatStatusLabel
    );
    byId("v2-post-meta").innerHTML = renderMetadataPanel(workspace, escapeHtml);
    byId("v2-current-status").textContent = formatStatusLabel(
      workspace.workflow.trackerStatus
    );
    byId("v2-recommended-status").textContent = formatStatusLabel(
      workspace.workflow.recommendedStatus
    );
    byId("v2-ready-summary").textContent = workspace.workflow.ready.ok
      ? "Ready gate passed"
      : `${workspace.workflow.ready.completedCount}/${workspace.workflow.ready.totalCount} ready checks complete`;
    byId("v2-checklist-items").innerHTML = renderChecklistItems(
      workspace.workflow.checklistItems,
      escapeHtml
    );
    byId("v2-status-select").innerHTML = workspace.workflow.statusOptions
      .map(
        (status) =>
          `<option value="${escapeHtml(status)}">${escapeHtml(
            formatStatusLabel(status)
          )}</option>`
      )
      .join("");
    byId("v2-status-select").value = workspace.workflow.trackerStatus;
    byId("v2-stage-menu").innerHTML = renderStageMenu(
      workspace,
      activeStageId,
      escapeHtml
    );
    byId("v2-stage-panel").innerHTML = renderSelectedStage(
      workspace,
      activeStageId,
      actionStates,
      escapeHtml
    );
    byId("v2-stage-panel").setAttribute(
      "aria-labelledby",
      `v2-stage-tab-${activeStageId}`
    );
    autosizeAllTextareas();
    syncV2Url();
  }

  async function reloadWorkspace(postId) {
    workspace = await request(`/api/content-v2/workspace/${postId}`);
    if (!workspace.stages.some((stage) => stage.id === activeStageId)) {
      activeStageId = pickDefaultStageId(workspace);
    }
    render();
    return workspace;
  }

  async function loadWorkspace(postId, options = {}) {
    const { preferredStageId = null } = options;
    setFeedback(`Loading Content V2 for ${postId}...`, "loading");
    resetActionStates();
    viewMode = "detail";
    saveListScrollPosition();
    await selectLegacyPost(postId);
    workspace = await request(`/api/content-v2/workspace/${postId}`);
    if (preferredStageId && workspace.stages.some((s) => s.id === preferredStageId)) {
      activeStageId = preferredStageId;
    } else {
      activeStageId = pickDefaultStageId(workspace);
    }
    render();
    setFeedback(`Content V2 loaded for ${postId}`, "success");
  }

  async function runAction(actionKey, handler, successMessage) {
    if (!workspace) return;
    setActionState(actionKey, "loading", "Working...");
    try {
      await handler();
      setActionState(actionKey, "success", "Done");
      setFeedback(successMessage, "success");
    } catch (error) {
      setActionState(actionKey, "error", error.message);
      setFeedback(error.message, "error");
      throw error;
    }
  }

  async function handleAction(actionKey) {
    if (!workspace) return;
    const postId = workspace.post.postId;
    if (actionKey === "status-save") {
      const nextStatus = byId("v2-status-select").value;
      await runAction(
        actionKey,
        async () => {
          await request(`/api/posts/${postId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: nextStatus })
          });
          await refreshPostState(postId);
          await reloadWorkspace(postId);
        },
        `Tracker status updated to ${formatStatusLabel(nextStatus)}`
      );
      return;
    }

    const stageActionMap = {
      "narrative-generate": {
        url: "/api/content-v2/narrative/generate",
        body: { postId },
        success: "Narrative draft generated"
      },
      "slides-generate": {
        url: "/api/content-v2/slides/generate",
        body: { postId },
        success: "Slides synced into draft"
      },
      "prompts-generate": {
        url: "/api/content-v2/prompts/generate",
        body: { postId },
        success: "Prompt set built"
      },
      "narrative-approve": {
        url: "/api/content-v2/stages/approve",
        body: { postId, stageId: "narrative" },
        success: "Narrative approved"
      },
      "slides-approve": {
        url: "/api/content-v2/stages/approve",
        body: { postId, stageId: "slides" },
        success: "Slides approved"
      },
      "prompts-approve": {
        url: "/api/content-v2/stages/approve",
        body: { postId, stageId: "prompts" },
        success: "Prompts approved"
      },
      "export-approve": {
        url: "/api/content-v2/stages/approve",
        body: { postId, stageId: "export" },
        success: "Export stage marked ready"
      }
    };

    if (stageActionMap[actionKey]) {
      const stageAction = stageActionMap[actionKey];
      await runAction(
        actionKey,
        async () => {
          workspace = await request(stageAction.url, {
            method: "POST",
            body: JSON.stringify(stageAction.body)
          });
          await refreshPostState(postId);
          render();
        },
        stageAction.success
      );
      return;
    }

    const slideMatch = actionKey.match(/^image-generate-(\d+)$/);
    if (slideMatch) {
      const slideIndex = Number(slideMatch[1]);
      const promptField = document.querySelector(`[data-v2-slide-prompt="${slideIndex}"]`);
      const prompt = promptField?.value?.trim() || "";
      if (!prompt) {
        setActionState(actionKey, "error", "No prompt available for this slide.");
        return;
      }
      const slideCode = String(slideIndex).padStart(2, "0");
      await runAction(
        actionKey,
        async () => {
          await request("/api/images/generate", {
            method: "POST",
            body: JSON.stringify({
              postId,
              prompt,
              model: byId("v2-fal-model").value,
              assetKey: `slide-${slideCode}`,
              label: `Slide ${slideCode}`
            })
          });
          await refreshPostState(postId);
          await reloadWorkspace(postId);
        },
        `Slide ${slideCode} image generated`
      );
    }
  }

  function wireEvents() {
    byId("v2-search-input").addEventListener("input", (event) => {
      searchQuery = event.target.value || "";
      renderPostList();
    });
    byId("v2-rubric-filter").addEventListener("change", (event) => {
      rubricFilter = event.target.value || "all";
      renderPostList();
    });
    byId("v2-save-status-btn").addEventListener("click", () => {
      handleAction("status-save").catch(() => {});
    });
    byId("v2-back-to-list-btn").addEventListener("click", () => {
      showListView();
    });
    const v2Panel = byId("panel-content-v2");
    v2Panel.addEventListener("keydown", (event) => {
      const menu = byId("v2-stage-menu");
      if (!menu || !workspace || viewMode !== "detail") return;
      const tabEl = event.target.closest('[role="tab"]');
      if (!tabEl || !menu.contains(tabEl)) return;
      const tabs = [...menu.querySelectorAll('[role="tab"]')];
      const i = tabs.indexOf(tabEl);
      if (i === -1) return;
      let next = i;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        next = (i + 1) % tabs.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        next = (i - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = tabs.length - 1;
      } else {
        return;
      }
      event.preventDefault();
      activeStageId = tabs[next].getAttribute("data-v2-stage-tab");
      render();
      requestAnimationFrame(() => {
        const refreshed = [...byId("v2-stage-menu").querySelectorAll('[role="tab"]')];
        refreshed[next]?.focus();
      });
    });
    const tableBody = byId("v2-posts-table-body");
    if (!postListKeydownWired) {
      postListKeydownWired = true;
      tableBody.addEventListener("keydown", (event) => {
        const tr = event.target.closest("tr[data-v2-post-id]");
        if (!tr || !tableBody.contains(tr)) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          const postId = tr.getAttribute("data-v2-post-id");
          loadWorkspace(postId).catch((error) => {
            setFeedback(`Content V2 error: ${error.message}`, "error");
          });
        }
      });
    }
    document.body.addEventListener("click", (event) => {
      const stageTab = event.target.closest("[data-v2-stage-tab]");
      if (stageTab) {
        activeStageId = stageTab.getAttribute("data-v2-stage-tab");
        render();
        requestAnimationFrame(() => {
          byId(`v2-stage-tab-${activeStageId}`)?.focus();
        });
        return;
      }
      const button = event.target.closest("[data-v2-action]");
      if (!button) return;
      handleAction(button.getAttribute("data-v2-action")).catch(() => {});
    });
  }

  async function onSectionActivated() {
    viewMode = "list";
    render();
    setFeedback("Content V2 list ready", "success");
  }

  function refreshFromGlobalState() {
    if (
      workspace &&
      getSelectedPostId() &&
      workspace.post.postId !== getSelectedPostId()
    ) {
      workspace = null;
    }
    render();
  }

  async function openFromUrl(postId, stageId) {
    const normalized = stageId && String(stageId).trim() ? String(stageId).trim() : null;
    await loadWorkspace(postId, { preferredStageId: normalized });
  }

  return {
    wireEvents,
    onSectionActivated,
    refreshFromGlobalState,
    loadWorkspace,
    openFromUrl
  };
}
