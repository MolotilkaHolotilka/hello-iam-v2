/**
 * User-facing render templates (UI template picker + registry sync).
 *
 * Path A (Canvas MVP): deep-dive series still use green-plate-intro via
 * content.json + mapping. CSS import (step 6) produces draft content; full
 * MP4 parity vs legacy folders must be verified before hiding any ID here.
 *
 * Deprecation (step 7): do NOT remove LEGACY_DEEP_DIVE_TEMPLATE_IDS until
 * each series passes the checklist in docs/MIGRATION_STEP7.md.
 */

/** Built-in demo template — listed first in the UI picker. */
export const BUILTIN_TEMPLATE_IDS = ["pipeline-demo"];

export const PUBLIC_TEMPLATE_LABELS = {
  "pipeline-demo": "Pipeline Demo (built-in)"
};

export const DEFAULT_PUBLIC_TEMPLATE_ID = "pipeline-demo";

/** Production deep-dive templates — still the default Studio/render path. */
export const LEGACY_DEEP_DIVE_TEMPLATE_IDS = [
  "i-am-khachkar-deep-dive",
  "i-am-lavash-deep-dive",
  "i-am-matsun-deep-dive",
  "i-am-dolma-deep-dive"
];

/**
 * CSS-imported replacements (canvas-from-css or green-plate drafts).
 * Empty until MP4 smoke comparison passes for a given series.
 */
export const PENDING_CSS_IMPORT_TEMPLATE_IDS = [];

/** User-facing render templates (UI + registry). */
export const ALLOWED_TEMPLATE_IDS = [
  ...BUILTIN_TEMPLATE_IDS,
  ...LEGACY_DEEP_DIVE_TEMPLATE_IDS,
  ...PENDING_CSS_IMPORT_TEMPLATE_IDS
];

const ALLOWED = new Set(ALLOWED_TEMPLATE_IDS);

/** Shared base layouts — not selectable in the UI. */
export const INTERNAL_TEMPLATE_DIRS = new Set(["green-plate-intro"]);

export function isPublicTemplateId(templateId) {
  return ALLOWED.has(templateId);
}

export function getPublicTemplateLabel(templateId) {
  return PUBLIC_TEMPLATE_LABELS[templateId] || null;
}

export function isBuiltinTemplate(templateId) {
  return BUILTIN_TEMPLATE_IDS.includes(templateId);
}

export function shouldIncludeTemplateDir(dirName) {
  if (INTERNAL_TEMPLATE_DIRS.has(dirName)) return false;
  if (dirName.startsWith("_")) return false;
  return ALLOWED.has(dirName);
}

/**
 * After CSS import + MP4 parity: move templateId from legacy to pending import
 * list by editing LEGACY_DEEP_DIVE_TEMPLATE_IDS / PENDING_CSS_IMPORT_TEMPLATE_IDS
 * above (or add imported id to PENDING and remove matching legacy id).
 */
export function isLegacyDeepDiveTemplate(templateId) {
  return LEGACY_DEEP_DIVE_TEMPLATE_IDS.includes(templateId);
}
