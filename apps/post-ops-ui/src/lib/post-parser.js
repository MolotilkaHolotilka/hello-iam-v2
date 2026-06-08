import fs from "node:fs/promises";
import path from "node:path";

function cleanValue(value) {
  return value.replace(/`/g, "").trim();
}

export async function parsePostFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw.split("\n");
  const filename = path.basename(filePath);
  const idFromFilename = filename.split("_")[0];

  let title = "";
  let rubric = "";
  let category = "unknown";
  let format = "carousel";
  let visualFormat = "standard carousel";
  let priority = "unknown";

  for (const line of lines) {
    if (!line.startsWith("- ")) continue;
    const normalized = line.slice(2);
    if (normalized.toLowerCase().startsWith("post id:")) continue;
    if (normalized.toLowerCase().startsWith("public title:")) {
      title = cleanValue(normalized.split(":").slice(1).join(":"));
    } else if (normalized.toLowerCase().startsWith("working title:") && !title) {
      title = cleanValue(normalized.split(":").slice(1).join(":"));
    } else if (normalized.toLowerCase().startsWith("rubric:")) {
      rubric = cleanValue(normalized.split(":").slice(1).join(":"));
    } else if (normalized.toLowerCase().startsWith("category:")) {
      category = cleanValue(normalized.split(":").slice(1).join(":")) || "unknown";
    } else if (normalized.toLowerCase().startsWith("format:")) {
      format = cleanValue(normalized.split(":").slice(1).join(":")) || "carousel";
    } else if (normalized.toLowerCase().startsWith("visual format:")) {
      visualFormat =
        cleanValue(normalized.split(":").slice(1).join(":")) || "standard carousel";
    } else if (normalized.toLowerCase().startsWith("priority:")) {
      priority = cleanValue(normalized.split(":").slice(1).join(":")) || "unknown";
    }
  }

  const headingLine = lines.find((line) => line.startsWith("# "));
  if (!title && headingLine) {
    title = headingLine.replace(/^#\s+/, "").trim();
  }
  if (!title) {
    title = idFromFilename;
  }
  if (!rubric) {
    rubric = "Unknown";
  }

  return {
    postId: idFromFilename,
    title,
    rubric,
    category,
    format,
    visualFormat,
    priority
  };
}
