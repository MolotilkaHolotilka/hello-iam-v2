import assert from "node:assert/strict";
import test from "node:test";
import {
  LlmCssMapperError,
  parseLlmJsonResponse,
  stripMarkdownJsonFences,
  validateMappedOutput
} from "../src/services/llm-css-mapper-service.js";

test("stripMarkdownJsonFences removes fenced JSON", () => {
  const input = '```json\n{"content":{"cards":[{}]},"warnings":[]}\n```';
  assert.equal(
    stripMarkdownJsonFences(input),
    '{"content":{"cards":[{}]},"warnings":[]}'
  );
});

test("parseLlmJsonResponse parses fenced and plain JSON", () => {
  const parsed = parseLlmJsonResponse(
    '```\n{"content":{"item":"x","cards":[{"title":""}]},"warnings":["a"]}\n```'
  );
  assert.equal(parsed.content.item, "x");
  assert.equal(parsed.warnings[0], "a");
});

test("validateMappedOutput accepts well-formed mapped payload", () => {
  const result = validateMappedOutput({
    content: {
      item: "lavash",
      cards: [{ title: "", background: "#fff" }]
    },
    schema: { cards: [{ fields: ["title", "background"] }] },
    warnings: ["image path empty"]
  });

  assert.equal(result.content.item, "lavash");
  assert.deepEqual(result.warnings, ["image path empty"]);
});

test("validateMappedOutput rejects missing cards", () => {
  assert.throws(
    () => validateMappedOutput({ content: { item: "x" } }),
    LlmCssMapperError
  );
});
