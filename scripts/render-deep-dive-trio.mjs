import fs from "node:fs/promises";

const API = "http://localhost:4242";
const TEMPLATE_IDS = [
  "i-am-khachkar-deep-dive",
  "i-am-lavash-deep-dive",
  "i-am-matsun-deep-dive",
  "i-am-dolma-deep-dive"
];
const OUT_LOG = "render-deep-dive-results.json";

async function loadTemplate(id) {
  const res = await fetch(`${API}/api/templates`);
  const json = await res.json();
  const tpl = json.templates.find((t) => t.id === id);
  if (!tpl) throw new Error(`Template not found: ${id}`);
  return tpl;
}

async function renderTemplate(id) {
  const tpl = await loadTemplate(id);
  const body = {
    templateId: id,
    templateName: tpl.name,
    exportName: tpl.workflow?.exportName || "Template",
    mapping: tpl.mappingExample,
    content: tpl.contentExample,
    workflow: tpl.workflow,
    animationPreset: "clean-rise"
  };

  console.log(`\n[${id}] starting render...`);
  const startedAt = Date.now();
  const res = await fetch(`${API}/api/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const elapsedMs = Date.now() - startedAt;
  const payload = await res.json();
  if (!res.ok) {
    console.error(`[${id}] FAILED in ${(elapsedMs / 1000).toFixed(1)}s:`, payload);
    return { id, ok: false, error: payload, elapsedMs };
  }
  console.log(`[${id}] OK in ${(elapsedMs / 1000).toFixed(1)}s, runId=${payload.runId}`);
  console.log(`  mp4: ${payload.links?.mp4}`);
  return { id, ok: true, runId: payload.runId, elapsedMs, links: payload.links };
}

async function main() {
  for (let i = 0; i < 30; i += 1) {
    try {
      const res = await fetch(`${API}/api/health`);
      if (res.ok) break;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const results = [];
  for (const id of TEMPLATE_IDS) {
    try {
      results.push(await renderTemplate(id));
    } catch (error) {
      console.error(`[${id}] threw:`, error.message);
      results.push({ id, ok: false, error: error.message });
    }
    await fs.writeFile(OUT_LOG, JSON.stringify(results, null, 2));
  }

  const ok = results.filter((r) => r.ok).length;
  console.log(`\n=== DONE: ${ok}/${results.length} succeeded ===`);
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
