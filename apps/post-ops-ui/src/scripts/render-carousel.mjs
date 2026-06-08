import { cp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderTemplate } from "../services/remotion-render-service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.join(__dirname, "../../../..");
const contentRoot = path.join(workspaceRoot, "content");
const args = process.argv.slice(2).filter((a) => a !== "--png-only");
const pngOnly = process.argv.includes("--png-only");
const templateId = args[0];
const desktopFolder = args[1];

if (!templateId || !desktopFolder) {
  console.error("Usage: node render-carousel.mjs <templateId> <desktopFolderName>");
  process.exit(1);
}

const templateDir = path.join(
  workspaceRoot,
  "apps/helloiam-remotion/src/templates",
  templateId
);

const [mapping, content, workflow] = await Promise.all([
  readFile(path.join(templateDir, "mapping.example.json"), "utf8"),
  readFile(path.join(templateDir, "content.example.json"), "utf8"),
  readFile(path.join(templateDir, "workflow.json"), "utf8")
]);

console.log(`Rendering ${templateId}...`);
const result = await renderTemplate({
  templateId,
  mapping: JSON.parse(mapping),
  content: JSON.parse(content),
  workflow: JSON.parse(workflow),
  pngOnly
});

const runDir = path.join(contentRoot, "artifacts", "renders", result.runId);
const desktopDir = path.join(process.env.USERPROFILE || "", "Desktop", desktopFolder);
await rm(desktopDir, { recursive: true, force: true });
await mkdir(desktopDir, { recursive: true });

for (const name of await readdir(runDir)) {
  await cp(path.join(runDir, name), path.join(desktopDir, name));
}

console.log(`Done: ${desktopDir}`);
console.log(`runId: ${result.runId}`);
