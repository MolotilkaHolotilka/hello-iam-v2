const REQUIRED_FLAGS = [
  "copyApproved",
  "coverApproved",
  "promptsReady",
  "storyPackReady",
  "captionAndCtaLocked"
];

export function validateReadyChecklist(readyChecklist) {
  const missing = REQUIRED_FLAGS.filter((flag) => !readyChecklist?.[flag]);
  return {
    ok: missing.length === 0,
    missing
  };
}
