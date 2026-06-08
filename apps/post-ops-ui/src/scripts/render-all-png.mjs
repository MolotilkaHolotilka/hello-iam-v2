import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(__dirname, "render-carousel.mjs");

const jobs = [
  ["i-am-lavash-deep-dive", "100_I-AM-LAVASH_renders"],
  ["i-am-dolma-deep-dive", "102_I-AM-DOLMA_renders"],
  ["i-am-matsun-deep-dive", "101_I-AM-MATSUN_renders"]
];

for (const [templateId, folder] of jobs) {
  console.log(`\n=== PNG ${templateId} ===\n`);
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [script, "--png-only", templateId, folder],
      {stdio: "inherit", cwd: path.join(__dirname, "../..")}
    );
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${templateId} exit ${code}`))
    );
  });
}

console.log("\nAll PNG carousels done.");
