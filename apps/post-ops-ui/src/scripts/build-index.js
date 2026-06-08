import path from "node:path";
import { PATHS } from "../lib/config.js";
import { withCmsDefaults } from "../lib/cms-defaults.js";
import { ensureDir, listFiles, readJson, writeJson } from "../lib/fs-utils.js";
import { parsePostFile } from "../lib/post-parser.js";
import { parseTrackerFile } from "../lib/tracker-parser.js";

function defaultApprovals() {
  return {
    brief: "draft",
    storyboard: "draft",
    storyPack: "draft",
    manifest: "draft"
  };
}

function defaultReadyChecklist() {
  return {
    copyApproved: false,
    coverApproved: false,
    promptsReady: false,
    storyPackReady: false,
    captionAndCtaLocked: false
  };
}

function inferCategory(postId) {
  if (postId.startsWith("0")) return "identity-category";
  if (postId.startsWith("1")) return "food";
  if (postId.startsWith("2")) return "culture";
  if (postId.startsWith("3")) return "streets";
  if (postId.startsWith("4")) return "objects";
  if (postId.startsWith("5")) return "sounds";
  if (postId.startsWith("6")) return "people";
  if (postId.startsWith("7")) return "places";
  if (postId.startsWith("8")) return "seasons";
  return "future-meta";
}

function findStoryboardPath(postId) {
  const numeric = postId.padStart(3, "0");
  return path.join("storyboards", `${numeric}_storyboard.md`);
}

function buildPostRecord(postData, trackerData, existingPost) {
  const postId = postData.postId;
  const now = new Date().toISOString();
  const status = existingPost?.status || trackerData?.status || "planned";
  const storyPackIds = [];
  if (/^00[1-3]$/.test(postId)) {
    storyPackIds.push("S1A", "S1B");
  }

  return withCmsDefaults({
    ...(existingPost || {}),
    postId,
    title: trackerData?.title || postData.title,
    rubric: trackerData?.rubric || postData.rubric,
    category: postData.category === "unknown" ? inferCategory(postId) : postData.category,
    format: trackerData?.format || postData.format,
    visualFormat: postData.visualFormat || existingPost?.visualFormat || "standard carousel",
    priority: postData.priority || "unknown",
    status,
    linkedStoryPackIds: storyPackIds,
    paths: {
      post: path.join("posts", `${postId}_${path.basename(postData.sourceName || "").split("_").slice(1).join("_")}`),
      storyboard: findStoryboardPath(postId),
      storyPack: existingPost?.paths?.storyPack ?? null,
      manifest: path.join("artifacts", postId, "manifest.latest.json")
    },
    approvals: existingPost?.approvals || defaultApprovals(),
    readyChecklist: existingPost?.readyChecklist || defaultReadyChecklist(),
    updatedAt: now
  });
}

async function buildIndex() {
  await ensureDir(PATHS.trackerIndexDir);
  await ensureDir(PATHS.runsDir);
  await ensureDir(PATHS.artifactsDir);

  const postFiles = await listFiles(PATHS.postsDir, ".md");
  const trackerMap = await parseTrackerFile(PATHS.trackerFile);
  const existingIndex = await readJson(PATHS.trackerIndexFile, null);
  const existingPosts = new Map(
    (existingIndex?.posts || []).map((post) => [post.postId, post])
  );

  const records = [];
  for (const filePath of postFiles) {
    const parsed = await parsePostFile(filePath);
    const sourceName = path.basename(filePath);
    const trackerData = trackerMap.get(parsed.postId);
    records.push(buildPostRecord(
      {
        ...parsed,
        sourceName
      },
      trackerData,
      existingPosts.get(parsed.postId)
    ));
  }

  records.sort((a, b) => a.postId.localeCompare(b.postId));
  const indexPayload = {
    generatedAt: new Date().toISOString(),
    source: {
      postsDir: "content/posts/",
      trackerFile: "content/tracker/07_LAUNCH_TRACKER.md"
    },
    posts: records
  };

  await writeJson(PATHS.trackerIndexFile, indexPayload);
  return indexPayload;
}

if (process.argv[1] && process.argv[1].endsWith("build-index.js")) {
  const payload = await buildIndex();
  process.stdout.write(
    `Indexed ${payload.posts.length} posts -> ${PATHS.trackerIndexFile}\n`
  );
}

export { buildIndex };
