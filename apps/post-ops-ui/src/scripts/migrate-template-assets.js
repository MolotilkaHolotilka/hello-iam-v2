import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  migrateLegacyPathsForTemplate,
  rewriteContentToTemplatePaths
} from "../services/template-assets-service.js";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const templatesRoot = path.join(
  workspaceRoot,
  "apps",
  "helloiam-remotion",
  "src",
  "templates"
);

async function main() {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(templatesRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const contentFile = path.join(templatesRoot, entry.name, "content.example.json");
    try {
      const raw = await readFile(contentFile, "utf8");
      const content = JSON.parse(raw);
      const copied = await migrateLegacyPathsForTemplate(entry.name, content);
      const next = rewriteContentToTemplatePaths(entry.name, content);
      await writeFile(contentFile, `${JSON.stringify(next, null, 2)}\n`, "utf8");
      process.stdout.write(`${entry.name}: copied ${copied} file(s), paths updated\n`);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      process.stderr.write(`${entry.name}: ${error.message}\n`);
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
