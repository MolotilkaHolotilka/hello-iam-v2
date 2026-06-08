/** User-facing render templates (UI + registry). */
export const ALLOWED_TEMPLATE_IDS = [
  "i-am-khachkar-deep-dive",
  "i-am-lavash-deep-dive",
  "i-am-matsun-deep-dive",
  "i-am-dolma-deep-dive"
];

const ALLOWED = new Set(ALLOWED_TEMPLATE_IDS);

/** Shared base layouts — not selectable in the UI. */
export const INTERNAL_TEMPLATE_DIRS = new Set(["green-plate-intro"]);

export function isPublicTemplateId(templateId) {
  return ALLOWED.has(templateId);
}

export function shouldIncludeTemplateDir(dirName) {
  if (INTERNAL_TEMPLATE_DIRS.has(dirName)) return false;
  if (dirName.startsWith("_")) return false;
  return ALLOWED.has(dirName);
}
