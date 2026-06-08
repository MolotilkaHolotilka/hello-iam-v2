import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import { PATHS } from "./lib/config.js";
import { buildIndex } from "./scripts/build-index.js";
import { readIndex } from "./storage/index-store.js";
import {
  listRenderTemplates,
  renderTemplate,
  resolvePropsForRender
} from "./services/remotion-render-service.js";
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
const host = process.env.HOST || "0.0.0.0";

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

app.get("/dev.html", (_req, res) => {
  res.sendFile(path.join(PATHS.webDir, "dev.html"));
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

app.listen(port, host, () => {
  process.stdout.write(`Post generation system listening on http://${host}:${port}\n`);
});
