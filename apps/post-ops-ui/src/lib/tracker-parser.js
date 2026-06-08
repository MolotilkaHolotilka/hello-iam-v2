import fs from "node:fs/promises";

const POST_LINE_RE =
  /^-\s+`?([A-Z0-9]{2,6})`?\s+`([^`]+)`\s+—\s+rubric:\s+([^—]+)\s+—\s+format:\s+([^—]+)\s+—\s+status:\s+([a-z-]+)\s*$/i;

export async function parseTrackerFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw.split("\n");
  const result = new Map();

  for (const line of lines) {
    const match = line.match(POST_LINE_RE);
    if (!match) continue;
    const [, postId, title, rubric, format, status] = match;
    result.set(postId, {
      postId,
      title: title.trim(),
      rubric: rubric.trim(),
      format: format.trim(),
      status: status.trim()
    });
  }

  return result;
}
