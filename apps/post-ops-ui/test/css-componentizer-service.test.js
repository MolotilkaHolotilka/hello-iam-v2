import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  componentizeCss,
  componentizeParsedCss
} from "../src/services/css-componentizer-service.js";
import { parseCss } from "../src/services/css-parse-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lavashFixture = path.join(__dirname, "fixtures", "lavash-card-1.css");

test("componentizeParsedCss groups lavash card 1 into logical components", async () => {
  const css = await readFile(lavashFixture, "utf8");
  const parsed = await parseCss(css);
  const result = componentizeParsedCss(parsed);

  assert.equal(result.version, 1);
  assert.equal(result.frame.width, 1080);
  assert.equal(result.frame.height, 1350);
  assert.equal(result.variables["--accent"], "#d61e23");
  assert.equal(result.meta.componentCount, result.components.length);

  const card = result.components.find((component) => component.id === "card-1");
  assert.ok(card);
  assert.equal(card.type, "box");
  assert.equal(card.role, "container");
  assert.equal(card.box.width.value, 1080);
  assert.equal(card.box.height.value, 1350);
  assert.equal(card.style.background, "var(--background)");

  const heroImage = result.components.find((component) => component.id === "hero-image");
  assert.ok(heroImage);
  assert.equal(heroImage.type, "image");
  assert.equal(heroImage.role, "image");
  assert.equal(heroImage.box.x.value, -182);
  assert.equal(heroImage.box.y.value, -238);
  assert.equal(heroImage.style["object-fit"], "contain");

  const titleBlock = result.components.find((component) => component.id === "title-block");
  assert.ok(titleBlock);
  assert.equal(titleBlock.type, "text");
  assert.equal(titleBlock.box.x.value, 40);
  assert.equal(titleBlock.box.y.value, 40);
  assert.equal(titleBlock.style["font-size"], "164px");

  const titleAccent = result.components.find((component) => component.id === "title-accent");
  assert.ok(titleAccent);
  assert.equal(titleAccent.type, "text");
  assert.equal(titleAccent.role, "title-accent");
  assert.equal(titleAccent.style.color, "var(--accent)");

  const label = result.components.find((component) => component.id === "label");
  assert.ok(label);
  assert.equal(label.type, "text");
  assert.equal(label.role, "label");
  assert.equal(label.box.y.value, 1285);
  assert.equal(label.style.display, "flex");
  assert.equal(label.style["align-items"], "flex-end");

  const hoverOnly = result.components.find((component) => component.selectors[0]?.includes(":hover"));
  assert.equal(hoverOnly, undefined);
});

test("componentizeCss parses and componentizes in one step", async () => {
  const css = await readFile(lavashFixture, "utf8");
  const result = await componentizeCss(css);

  assert.ok(result.components.length >= 5);
  assert.ok(result.components.every((component) => component.text === ""));
  assert.ok(result.components.every((component) => Array.isArray(component.selectors)));
});
