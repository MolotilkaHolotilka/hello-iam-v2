import assert from "node:assert/strict";
import test from "node:test";
import {
  ALLOWED_TEMPLATE_IDS,
  BUILTIN_TEMPLATE_IDS,
  DEFAULT_PUBLIC_TEMPLATE_ID,
  INTERNAL_TEMPLATE_DIRS,
  LEGACY_DEEP_DIVE_TEMPLATE_IDS,
  PENDING_CSS_IMPORT_TEMPLATE_IDS,
  getPublicTemplateLabel,
  isBuiltinTemplate,
  isLegacyDeepDiveTemplate,
  isPublicTemplateId,
  shouldIncludeTemplateDir
} from "../src/lib/template-allowlist.js";

test("pipeline-demo is first built-in public template", () => {
  assert.deepEqual(BUILTIN_TEMPLATE_IDS, ["pipeline-demo"]);
  assert.equal(DEFAULT_PUBLIC_TEMPLATE_ID, "pipeline-demo");
  assert.equal(getPublicTemplateLabel("pipeline-demo"), "Pipeline Demo (built-in)");
  assert.equal(isBuiltinTemplate("pipeline-demo"), true);
  assert.equal(isPublicTemplateId("pipeline-demo"), true);
  assert.equal(shouldIncludeTemplateDir("pipeline-demo"), true);
  assert.equal(ALLOWED_TEMPLATE_IDS[0], "pipeline-demo");
});

test("legacy deep-dive templates remain public until migration sign-off", () => {
  const legacyExpected = [
    "i-am-khachkar-deep-dive",
    "i-am-lavash-deep-dive",
    "i-am-matsun-deep-dive",
    "i-am-dolma-deep-dive"
  ];

  assert.deepEqual(LEGACY_DEEP_DIVE_TEMPLATE_IDS, legacyExpected);
  assert.deepEqual(PENDING_CSS_IMPORT_TEMPLATE_IDS, []);
  assert.deepEqual(ALLOWED_TEMPLATE_IDS, ["pipeline-demo", ...legacyExpected]);

  for (const id of legacyExpected) {
    assert.equal(isPublicTemplateId(id), true);
    assert.equal(isLegacyDeepDiveTemplate(id), true);
    assert.equal(shouldIncludeTemplateDir(id), true);
  }
});

test("internal base layout is hidden from UI and registry", () => {
  assert.equal(shouldIncludeTemplateDir("green-plate-intro"), false);
  assert.ok(INTERNAL_TEMPLATE_DIRS.has("green-plate-intro"));
  assert.equal(isPublicTemplateId("green-plate-intro"), false);
});

test("underscore-prefixed template dirs are excluded", () => {
  assert.equal(shouldIncludeTemplateDir("_draft-template"), false);
});
