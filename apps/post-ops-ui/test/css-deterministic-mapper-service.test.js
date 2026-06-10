import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { componentizeCss } from "../src/services/css-componentizer-service.js";
import { mapComponentsToContentDeterministic } from "../src/services/css-deterministic-mapper-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lavashFixture = path.join(__dirname, "fixtures", "lavash-card-1.css");

test("mapComponentsToContentDeterministic maps lavash CSS variables", async () => {
  const css = await readFile(lavashFixture, "utf8");
  const componentized = await componentizeCss(css, { frame: { width: 1080, height: 1350 } });
  const mapped = mapComponentsToContentDeterministic(componentized, {
    templateId: "css-import-card-1"
  });

  assert.equal(mapped.content.cards.length, 1);
  assert.equal(mapped.content.cards[0].background, "#D9DDE0");
  assert.equal(mapped.content.cards[0].accentColor, "#D61E23");
  assert.equal(mapped.content.cards[0].titleColor, "#0F0F10");
  assert.equal(mapped.content.cards[0].introLayout, "lavash");
  assert.ok(mapped.warnings.length >= 1);
});

test("mapComponentsToContentDeterministic extracts CSS content text", async () => {
  const css = `
    .card-1 { background: #fff; }
    .card-1 .title-line { content: "HELLO"; color: #111; }
    .card-1 .title-accent { content: "LAVASH"; color: #d61e23; }
    .card-1 .label { content: "AM FOOD"; color: #000; }
  `;
  const componentized = await componentizeCss(css);
  const mapped = mapComponentsToContentDeterministic(componentized);

  assert.equal(mapped.content.cards[0].title, "HELLO");
  assert.equal(mapped.content.cards[0].titleAccent, "LAVASH");
  assert.equal(mapped.content.cards[0].label, "AM FOOD");
});
