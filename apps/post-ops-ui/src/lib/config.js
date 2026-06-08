import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const APP_ROOT = path.resolve(__dirname, "..", "..");
export const WORKSPACE_ROOT = path.resolve(APP_ROOT, "..", "..");
const CONTENT_ROOT_INPUT = process.env.CONTENT_ROOT || "content";
const ABS_CONTENT_ROOT = path.isAbsolute(CONTENT_ROOT_INPUT)
  ? CONTENT_ROOT_INPUT
  : path.join(WORKSPACE_ROOT, CONTENT_ROOT_INPUT);

function pickReadPath(primaryPath, legacyPath) {
  return existsSync(primaryPath) ? primaryPath : legacyPath;
}

export const PATHS = {
  appRoot: APP_ROOT,
  root: WORKSPACE_ROOT,
  workspaceRoot: WORKSPACE_ROOT,
  contentRoot: ABS_CONTENT_ROOT,
  legacyContentRoot: WORKSPACE_ROOT,
  postsDir: pickReadPath(
    path.join(ABS_CONTENT_ROOT, "posts"),
    path.join(WORKSPACE_ROOT, "posts")
  ),
  storyboardsDir: pickReadPath(
    path.join(ABS_CONTENT_ROOT, "storyboards"),
    path.join(WORKSPACE_ROOT, "storyboards")
  ),
  trackerFile: pickReadPath(
    path.join(ABS_CONTENT_ROOT, "tracker", "07_LAUNCH_TRACKER.md"),
    path.join(WORKSPACE_ROOT, "07_LAUNCH_TRACKER.md")
  ),
  trackerIndexDir: path.join(ABS_CONTENT_ROOT, "tracker"),
  trackerIndexFile: path.join(ABS_CONTENT_ROOT, "tracker", "index.json"),
  legacyTrackerIndexFile: path.join(WORKSPACE_ROOT, "tracker", "index.json"),
  runsDir: path.join(ABS_CONTENT_ROOT, "runs"),
  artifactsDir: path.join(ABS_CONTENT_ROOT, "artifacts"),
  manifestTemplateFile: pickReadPath(
    path.join(ABS_CONTENT_ROOT, "templates", "08_VIDEO_MANIFEST_TEMPLATE.json"),
    path.join(WORKSPACE_ROOT, "08_VIDEO_MANIFEST_TEMPLATE.json")
  ),
  webDir: path.join(APP_ROOT, "src", "web")
};

export const STATUS_ORDER = [
  "planned",
  "writing",
  "storyboarding",
  "prompting",
  "asset-ready",
  "editing",
  "ready"
];

export const APPROVAL_STATES = ["draft", "review", "approved"];
