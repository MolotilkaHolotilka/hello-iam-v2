import { PATHS, STATUS_ORDER, APPROVAL_STATES } from "../lib/config.js";
import { withCmsDefaults } from "../lib/cms-defaults.js";
import { readJson, writeJson } from "../lib/fs-utils.js";
import { buildIndex } from "../scripts/build-index.js";

function mergePostRecord(post, patch) {
  return withCmsDefaults({
    ...post,
    ...patch,
    approvals: {
      ...post.approvals,
      ...(patch.approvals || {})
    },
    readyChecklist: {
      ...post.readyChecklist,
      ...(patch.readyChecklist || {})
    },
    draft: {
      ...(post.draft || {}),
      ...(patch.draft || {}),
      copy: {
        ...(post.draft?.copy || {}),
        ...(patch.draft?.copy || {})
      },
      prompts: {
        ...(post.draft?.prompts || {}),
        ...(patch.draft?.prompts || {})
      }
    },
    generation: {
      ...(post.generation || {}),
      ...(patch.generation || {})
    },
    editorial: {
      ...(post.editorial || {}),
      ...(patch.editorial || {})
    },
    updatedAt: new Date().toISOString()
  });
}

export async function readIndex() {
  const existing = await readJson(PATHS.trackerIndexFile, null);
  if (existing) return existing;
  const legacy = await readJson(PATHS.legacyTrackerIndexFile, null);
  if (legacy) return legacy;
  return buildIndex();
}

export async function writeIndex(indexData) {
  const payload = {
    ...indexData,
    generatedAt: new Date().toISOString()
  };
  await writeJson(PATHS.trackerIndexFile, payload);
  return payload;
}

export async function listPosts() {
  const index = await readIndex();
  return (index.posts || []).map(withCmsDefaults);
}

export async function getPost(postId) {
  const posts = await listPosts();
  return posts.find((post) => post.postId === postId) || null;
}

export async function updatePost(postId, patch) {
  const index = await readIndex();
  const postIndex = index.posts.findIndex((post) => post.postId === postId);
  if (postIndex === -1) {
    throw new Error(`Post ${postId} not found`);
  }
  index.posts[postIndex] = mergePostRecord(
    withCmsDefaults(index.posts[postIndex]),
    patch
  );
  await writeIndex(index);
  return withCmsDefaults(index.posts[postIndex]);
}

export function validateStatus(status) {
  return STATUS_ORDER.includes(status);
}

export function validateApprovalState(state) {
  return APPROVAL_STATES.includes(state);
}
