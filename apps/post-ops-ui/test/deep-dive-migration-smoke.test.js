import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { LEGACY_DEEP_DIVE_TEMPLATE_IDS } from "../src/lib/template-allowlist.js";
import { importCssToTemplate } from "../src/services/css-import-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const templatesRoot = path.join(
  repoRoot,
  "apps/helloiam-remotion/src/templates"
);
const lavashFixture = path.join(__dirname, "fixtures", "lavash-card-1.css");

const REQUIRED_TEMPLATE_FILES = [
  "template.tsx",
  "workflow.json",
  "mapping.example.json",
  "content.example.json",
  "README.md"
];

const SERIES_META = {
  "i-am-lavash-deep-dive": { introLayout: "lavash", card1Background: "#D9DDE0" },
  "i-am-dolma-deep-dive": { introLayout: "dolma", card1Background: "#4A7BFF" },
  "i-am-matsun-deep-dive": { introLayout: "matsun", card1Background: "#0F0F10" },
  "i-am-khachkar-deep-dive": { introLayout: "lavash", card1Background: "#D9DDE0" }
};

for (const templateId of LEGACY_DEEP_DIVE_TEMPLATE_IDS) {
  test(`${templateId} has required template files and card 1 metadata`, async () => {
    const templateDir = path.join(templatesRoot, templateId);

    for (const fileName of REQUIRED_TEMPLATE_FILES) {
      await access(path.join(templateDir, fileName));
    }

    const content = JSON.parse(
      await readFile(path.join(templateDir, "content.example.json"), "utf8")
    );
    const meta = SERIES_META[templateId];

    assert.ok(Array.isArray(content.cards) && content.cards.length >= 7);
    assert.equal(content.cards[0].introLayout, meta.introLayout);
    assert.equal(
      content.cards[0].background.toUpperCase(),
      meta.card1Background.toUpperCase()
    );
  });
}

test("lavash card-1 CSS import smoke matches legacy hello palette", async () => {
  const css = await readFile(lavashFixture, "utf8");
  const result = await importCssToTemplate(
    { css, templateId: "smoke-lavash-import" },
    {
      llmClient: async () =>
        JSON.stringify({
          content: {
            item: "smoke-lavash",
            cards: [
              {
                title: "",
                titleAccent: "",
                label: "",
                image: "",
                background: "#D9DDE0",
                titleColor: "#0F0F10",
                accentColor: "#D61E23",
                labelColor: "#000000",
                introLayout: "lavash"
              }
            ]
          },
          schema: { cards: [{ fields: ["title", "background", "accentColor"] }] },
          warnings: []
        })
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.componentized.frame.width, 1080);
  assert.equal(result.componentized.frame.height, 1350);
  assert.equal(result.mapped.content.cards[0].background, "#D9DDE0");
  assert.equal(result.mapped.content.cards[0].accentColor, "#D61E23");
  assert.equal(result.mapped.content.cards[0].introLayout, "lavash");
});
