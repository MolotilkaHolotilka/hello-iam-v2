import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import { PATHS } from "./lib/config.js";
import { buildIndex } from "./scripts/build-index.js";
import {
  getPost,
  listPosts,
  readIndex,
  updatePost,
  validateApprovalState,
  validateStatus
} from "./storage/index-store.js";
import { readPostBundle, writeTextFile } from "./storage/content-repo.js";
import { getLatestRun, listArtifacts, listRuns } from "./storage/run-log-store.js";
import { runGeneration } from "./services/generation-service.js";
import { validateReadyChecklist } from "./services/ready-guard.js";
import {
  applyGeneratedVariant,
  generateContentVariant,
  getCmsDashboard,
  getWorkflowQueue,
  updateEditorialSettings
} from "./services/content-workspace-service.js";
import { generateImageWithFal } from "./services/fal-image-service.js";
import {
  approveContentV2Stage,
  generateNarrativeDraftV2,
  generatePromptsDraftV2,
  generateSlidesDraftV2,
  getContentV2Workspace
} from "./services/content-v2-service.js";
import {
  listRenderTemplates,
  renderTemplate,
  resolvePropsForRender
} from "./services/remotion-render-service.js";
import { createTemplateWorkflowFromJsx } from "./services/template-workflow-service.js";
import {
  deleteTemplateAsset,
  ensureTemplateAssetDirs,
  getTemplateBucketDir,
  listTemplateAssets,
  sanitizeAssetFileName
} from "./services/template-assets-service.js";

const appRootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(appRootDir, ".env") });

const app = express();
const port = Number(process.env.PORT || 4242);

app.use(express.json({ limit: "10mb" }));

app.get("/api/health", async (_req, res) => {
  const index = await readIndex();
  res.json({ ok: true, postCount: index.posts.length });
});

app.get("/api/templates", async (_req, res) => {
  try {
    const payload = await listRenderTemplates();
    res.json(payload);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message,
      details: error.details || []
    });
  }
});

const templateAssetUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      try {
        const dir = getTemplateBucketDir(req.params.templateId, req.params.bucket);
        cb(null, dir);
      } catch (error) {
        cb(error);
      }
    },
    filename: (_req, file, cb) => {
      try {
        cb(null, sanitizeAssetFileName(file.originalname));
      } catch (error) {
        cb(error);
      }
    }
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (!/\.(png|jpe?g|webp|gif|svg)$/i.test(file.originalname)) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  }
});

app.get("/api/templates/:templateId/assets", async (req, res) => {
  try {
    const payload = await listTemplateAssets(req.params.templateId);
    res.json(payload);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post(
  "/api/templates/:templateId/assets/:bucket",
  async (req, res, next) => {
    await ensureTemplateAssetDirs(req.params.templateId);
    next();
  },
  templateAssetUpload.array("files", 20),
  async (req, res) => {
    try {
      const assets = await listTemplateAssets(req.params.templateId);
      res.json({
        uploaded: (req.files || []).map((file) => ({
          name: file.filename,
          bucket: req.params.bucket,
          path: `templates/${req.params.templateId}/${req.params.bucket}/${file.filename}`
        })),
        assets
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

app.delete("/api/templates/:templateId/assets/:bucket/:fileName", async (req, res) => {
  try {
    const payload = await deleteTemplateAsset(
      req.params.templateId,
      req.params.bucket,
      req.params.fileName
    );
    res.json(payload);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/templates/from-jsx", async (req, res) => {
  try {
    const payload = await createTemplateWorkflowFromJsx(req.body || {});
    res.json(payload);
  } catch (error) {
    res.status(error.statusCode || 400).json({
      error: error.message,
      details: error.details || []
    });
  }
});

app.post("/api/resolve-props", async (req, res) => {
  try {
    const payload = await resolvePropsForRender(req.body || {});
    res.json({
      ok: true,
      props: payload.props
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      error: error.message,
      details: error.details || []
    });
  }
});

app.post("/api/render", async (req, res) => {
  try {
    const payload = await renderTemplate(req.body || {});
    res.json(payload);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message,
      code: error.code || "RENDER_ERROR",
      details: error.details || []
    });
  }
});

app.post("/api/index/rebuild", async (_req, res) => {
  const index = await buildIndex();
  res.json(index);
});

app.get("/api/posts", async (_req, res) => {
  const posts = await listPosts();
  res.json(posts);
});

app.get("/api/cms/dashboard", async (_req, res) => {
  const summary = await getCmsDashboard();
  res.json(summary);
});

app.get("/api/workflow/queue", async (_req, res) => {
  const queue = await getWorkflowQueue();
  res.json(queue);
});

app.get("/api/posts/:postId", async (req, res) => {
  const post = await getPost(req.params.postId);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const bundle = await readPostBundle(post);
  res.json({ post, bundle });
});

app.get("/api/content-v2/workspace/:postId", async (req, res) => {
  try {
    const workspace = await getContentV2Workspace(req.params.postId);
    res.json(workspace);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch("/api/posts/:postId/status", async (req, res) => {
  const { status } = req.body || {};
  if (!validateStatus(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const post = await getPost(req.params.postId);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  if (status === "ready") {
    const readyCheck = validateReadyChecklist(post.readyChecklist);
    if (!readyCheck.ok) {
      res.status(409).json({
        error: "Definition of Ready is incomplete",
        missing: readyCheck.missing
      });
      return;
    }
  }
  const updated = await updatePost(req.params.postId, { status });
  res.json(updated);
});

app.patch("/api/posts/:postId/checklist", async (req, res) => {
  const post = await getPost(req.params.postId);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const checklistPatch = req.body?.readyChecklist || {};
  const updated = await updatePost(req.params.postId, {
    readyChecklist: checklistPatch
  });
  res.json(updated);
});

app.patch("/api/posts/:postId/approvals", async (req, res) => {
  const { section, state } = req.body || {};
  if (!["brief", "storyboard", "storyPack", "manifest"].includes(section)) {
    res.status(400).json({ error: "Invalid section" });
    return;
  }
  if (!validateApprovalState(state)) {
    res.status(400).json({ error: "Invalid approval state" });
    return;
  }
  const post = await getPost(req.params.postId);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const updated = await updatePost(req.params.postId, {
    approvals: {
      [section]: state
    }
  });
  res.json(updated);
});

app.patch("/api/posts/:postId/content", async (req, res) => {
  const { section, content } = req.body || {};
  const post = await getPost(req.params.postId);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  if (!["post", "storyboard", "storyPack", "manifest"].includes(section)) {
    res.status(400).json({ error: "Invalid section" });
    return;
  }
  const relativePath = post.paths[section];
  if (!relativePath) {
    res.status(400).json({
      error: `Section ${section} is not linked for this post`
    });
    return;
  }
  await writeTextFile(relativePath, content || "");
  res.json({ ok: true, path: relativePath });
});

app.patch("/api/posts/:postId/editorial", async (req, res) => {
  try {
    const updated = await updateEditorialSettings({
      postId: req.params.postId,
      editorial: req.body?.editorial || {}
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/generation/run", async (req, res) => {
  try {
    const runPayload = await runGeneration(req.body || {});
    res.json(runPayload);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/content/generate", async (req, res) => {
  try {
    const payload = await generateContentVariant(req.body || {});
    res.json(payload);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/content/apply", async (req, res) => {
  try {
    const payload = await applyGeneratedVariant(req.body || {});
    res.json(payload);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/images/generate", async (req, res) => {
  try {
    const payload = await generateImageWithFal(req.body || {});
    res.json(payload);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/content-v2/narrative/generate", async (req, res) => {
  try {
    const payload = await generateNarrativeDraftV2(req.body?.postId);
    res.json(payload);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/content-v2/slides/generate", async (req, res) => {
  try {
    const payload = await generateSlidesDraftV2(req.body?.postId);
    res.json(payload);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/content-v2/prompts/generate", async (req, res) => {
  try {
    const payload = await generatePromptsDraftV2(req.body?.postId);
    res.json(payload);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/content-v2/stages/approve", async (req, res) => {
  try {
    const payload = await approveContentV2Stage(req.body || {});
    res.json(payload);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/generation/runs/:postId", async (req, res) => {
  const runs = await listRuns(req.params.postId);
  res.json(runs);
});

app.get("/api/generation/runs/:postId/latest", async (req, res) => {
  const run = await getLatestRun(req.params.postId);
  res.json(run);
});

app.get("/api/artifacts/:postId", async (req, res) => {
  const artifacts = await listArtifacts(req.params.postId);
  res.json(artifacts);
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

const remotionPublic = path.join(
  PATHS.workspaceRoot,
  "apps",
  "helloiam-remotion",
  "public"
);

app.use(
  "/assets",
  express.static(remotionPublic, { fallthrough: true })
);
app.use("/content", express.static(PATHS.contentRoot, { fallthrough: true }));
app.use(express.static(PATHS.webDir, { fallthrough: true }));

app.get("/", (_req, res) => {
  res.sendFile(path.join(PATHS.webDir, "index.html"));
});

app.get("/assets.html", (_req, res) => {
  res.sendFile(path.join(PATHS.webDir, "assets.html"));
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    next();
    return;
  }
  if (req.path.includes(".")) {
    next();
    return;
  }
  res.sendFile(path.join(PATHS.webDir, "index.html"));
});

app.use((error, _req, res, next) => {
  if (!error) {
    next();
    return;
  }
  res.status(400).json({ error: error.message });
});

app.listen(port, () => {
  process.stdout.write(`Post generation system listening on :${port}\n`);
});
