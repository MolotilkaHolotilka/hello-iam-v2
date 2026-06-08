import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { CssParseError } from "../src/services/css-parse-service.js";
import { importCssToTemplate } from "../src/services/css-import-service.js";
import { LlmCssMapperError } from "../src/services/llm-css-mapper-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lavashFixture = path.join(__dirname, "fixtures", "lavash-card-1.css");

const mockMappedPayload = {
  content: {
    item: "imported-lavash-card",
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
  schema: {
    cards: [
      {
        fields: [
          "title",
          "titleAccent",
          "label",
          "image",
          "background",
          "titleColor",
          "accentColor",
          "labelColor"
        ]
      }
    ]
  },
  warnings: ["Image path left empty — upload in Studio"]
};

function createMockLlmClient(response = mockMappedPayload) {
  return async () => JSON.stringify(response);
}

test("importCssToTemplate componentizes CSS and maps via injected LLM", async () => {
  const css = await readFile(lavashFixture, "utf8");
  const result = await importCssToTemplate(
    { css, templateId: "my-imported-template" },
    { llmClient: createMockLlmClient() }
  );

  assert.equal(result.ok, true);
  assert.equal(result.templateId, "my-imported-template");
  assert.equal(result.componentized.frame.width, 1080);
  assert.ok(result.componentized.components.length >= 5);
  assert.equal(result.mapped.content.item, "imported-lavash-card");
  assert.equal(result.mapped.content.cards.length, 1);
  assert.equal(result.mapped.content.cards[0].background, "#D9DDE0");
  assert.ok(result.mapped.warnings.length >= 1);
});

test("importCssToTemplate rejects empty css", async () => {
  await assert.rejects(
    () => importCssToTemplate({ css: "  " }, { llmClient: createMockLlmClient() }),
    /css must be a non-empty string/
  );
});

test("importCssToTemplate surfaces CSS parse errors as 400", async () => {
  await assert.rejects(
    () => importCssToTemplate({ css: "{ broken" }, { llmClient: createMockLlmClient() }),
    CssParseError
  );
});

test("importCssToTemplate surfaces LLM failures as 502", async () => {
  const css = await readFile(lavashFixture, "utf8");
  await assert.rejects(
    () =>
      importCssToTemplate(
        { css },
        {
          llmClient: async () => {
            throw new LlmCssMapperError("LLM unavailable");
          }
        }
      ),
    LlmCssMapperError
  );
});

const integrationTest = process.env.OPENAI_API_KEY ? test : test.skip;

integrationTest("importCssToTemplate live OpenAI integration", async () => {
  const css = await readFile(lavashFixture, "utf8");
  const result = await importCssToTemplate({ css, templateId: "integration-test-card" });

  assert.equal(result.ok, true);
  assert.ok(Array.isArray(result.mapped.content.cards));
  assert.ok(result.mapped.content.cards.length >= 1);
});
