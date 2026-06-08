import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  CssParseError,
  parseCss,
  parseCssFile
} from "../src/services/css-parse-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lavashFixture = path.join(__dirname, "fixtures", "lavash-card-1.css");

test("parseCss extracts selectors, declarations, and CSS variables", async () => {
  const css = await readFile(lavashFixture, "utf8");
  const parsed = await parseCss(css, { from: lavashFixture });

  assert.equal(parsed.version, 1);
  assert.equal(parsed.source, "css");
  assert.equal(parsed.meta.ruleCount, 9);
  assert.equal(parsed.variables["--accent"], "#d61e23");
  assert.equal(parsed.variables["--background"], "#d9dde0");

  const cardRule = parsed.rules.find((rule) => rule.selector === ".card-1");
  assert.ok(cardRule);
  assert.equal(cardRule.layout.position.raw, "relative");
  assert.equal(cardRule.layout.width.value, 1080);
  assert.equal(cardRule.layout.height.value, 1350);
  assert.equal(cardRule.colors.background.raw, "var(--background)");

  const heroImage = parsed.rules.find((rule) => rule.selector === ".card-1 .hero-image");
  assert.ok(heroImage);
  assert.equal(heroImage.layout.left.value, -182);
  assert.equal(heroImage.layout.top.value, -238);
  assert.equal(heroImage.layout.width.value, 2060);

  const titleBlock = parsed.rules.find((rule) => rule.selector === ".card-1 .title-block");
  assert.ok(titleBlock);
  assert.equal(titleBlock.typography["font-size"].value, 164);
  assert.equal(titleBlock.typography["font-weight"].raw, "700");
  assert.equal(titleBlock.typography["text-transform"].raw, "uppercase");

  const hoverRule = parsed.rules.find((rule) => rule.selector === ".card-1 .label:hover");
  assert.ok(hoverRule);
  assert.equal(hoverRule.pseudo, ":hover");
  assert.equal(hoverRule.baseSelector, ".card-1 .label");

  const mediaRule = parsed.rules.find(
    (rule) => rule.selector === ".card-1 .title-block" && rule.mediaQuery
  );
  assert.ok(mediaRule);
  assert.match(mediaRule.mediaQuery, /max-width:\s*1080px/);
  assert.equal(mediaRule.typography["font-size"].value, 140);
});

test("parseCssFile reads CSS from disk", async () => {
  const parsed = await parseCssFile(lavashFixture);
  assert.ok(parsed.rules.length >= 5);
});

test("parseCss rejects empty input", async () => {
  await assert.rejects(() => parseCss("   "), CssParseError);
});

test("parseCss rejects invalid CSS", async () => {
  await assert.rejects(() => parseCss("{ broken"), CssParseError);
});
