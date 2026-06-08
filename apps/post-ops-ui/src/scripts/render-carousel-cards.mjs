import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { prepareWorkflowPayload } from "../services/template-workflow-service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.join(__dirname, "../../../..");
const remotionRoot = path.join(workspaceRoot, "apps/helloiam-remotion");
const remotionCli = path.join(
  remotionRoot,
  "node_modules",
  "@remotion",
  "cli",
  "remotion-cli.js"
);
const remotionEntry = path.join(remotionRoot, "src/index.ts");

const templateId = process.argv[2];
const desktopFolder = process.argv[3];
const cardIndexes = process.argv
  .slice(4)
  .map((n) => Number(n))
  .filter((n) => Number.isFinite(n) && n >= 1);

if (!templateId || !desktopFolder || cardIndexes.length === 0) {
  console.error(
    "Usage: node render-carousel-cards.mjs <templateId> <desktopFolder> <card1> [card2...]"
  );
  process.exit(1);
}

function runRemotion(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [remotionCli, ...args], {
      cwd: remotionRoot,
      windowsHide: true
    });
    let stderr = "";
    child.stderr.on("data", (c) => {
      stderr += c.toString();
    });
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(stderr.slice(-4000) || `exit ${code}`))
    );
  });
}

const templateDir = path.join(
  workspaceRoot,
  "apps/helloiam-remotion/src/templates",
  templateId
);

const [mappingRaw, contentRaw, workflowRaw] = await Promise.all([
  readFile(path.join(templateDir, "mapping.example.json"), "utf8"),
  readFile(path.join(templateDir, "content.example.json"), "utf8"),
  readFile(path.join(templateDir, "workflow.json"), "utf8")
]);
const mapping = JSON.parse(mappingRaw);
const content = JSON.parse(contentRaw);
const workflow = JSON.parse(workflowRaw);

const prepared = await prepareWorkflowPayload({
  templateId,
  mapping,
  content,
  workflow
});

const cardCount = prepared.workflow.cardCount || 7;
const compositionId = prepared.workflow.composition || "TemplateRenderPortrait";
const durationPerCard = Number(prepared.workflow.durationPerCardFrames) || 210;
const compositionDuration = durationPerCard * cardCount;
const segmentFrames = Math.max(1, Math.floor(compositionDuration / cardCount));

const runDir = path.join(
  workspaceRoot,
  "content",
  "artifacts",
  "renders",
  `partial-${Date.now()}`
);
await mkdir(runDir, { recursive: true });
const propsPath = path.join(runDir, "props.json");
await writeFile(propsPath, `${JSON.stringify(prepared.resolved.props, null, 2)}\n`, "utf8");

const desktopDir = path.join(process.env.USERPROFILE || "", "Desktop", desktopFolder);
await mkdir(desktopDir, { recursive: true });

for (const cardNum of cardIndexes) {
  const index = cardNum - 1;
  const pad = String(cardNum).padStart(2, "0");
  const pngOut = path.join(runDir, `card-${pad}.png`);
  const mp4Out = path.join(runDir, `video-card-${pad}.mp4`);
  const frame = Math.min(
    compositionDuration - 1,
    index * segmentFrames + Math.max(0, Math.min(30, segmentFrames - 1))
  );
  const startFrame = index * segmentFrames;
  const endFrame = Math.min(compositionDuration - 1, (index + 1) * segmentFrames - 1);

  console.log(`Card ${cardNum} (frame ${frame})...`);
  await runRemotion([
    "still",
    remotionEntry,
    compositionId,
    pngOut,
    "--props",
    propsPath,
    "--frame",
    String(frame)
  ]);
  await runRemotion([
    "render",
    remotionEntry,
    compositionId,
    mp4Out,
    "--props",
    propsPath,
    "--frames",
    `${startFrame}-${endFrame}`
  ]);

  await cp(pngOut, path.join(desktopDir, `card-${pad}.png`));
  await cp(mp4Out, path.join(desktopDir, `video-card-${pad}.mp4`));
  if (cardNum === 1) {
    await cp(pngOut, path.join(desktopDir, "still.png"));
    await cp(mp4Out, path.join(desktopDir, "video.mp4"));
  }
  console.log(`Updated card-${pad} on Desktop`);
}

console.log(`Done: ${desktopDir}`);
