# Runbook: Post Generation & CMS Workflow

## Trigger
- Manual trigger from web UI `Generation Console`.
- Manual trigger from web UI `Content V2`.
- API trigger via `POST /api/generation/run`.
- API trigger via `POST /api/content/generate` for in-record content variants.
- API trigger via `POST /api/images/generate` for local image generation via fal.ai.

## Inputs
- `postId` (existing post from `content/tracker/index.json`).
- `step` (`brief-to-copy`, `copy-to-storyboard`, `storyboard-to-manifest`).
- `dryRun` (optional boolean).
- `model` (optional string, default `deterministic-v1`).
- `target` for in-record generation (`title`, `oneLineThesis`, `slides`, `caption`, `cta`, `coverPrompt`, `slidePrompts`).
- `instruction` for in-record generation refinement.
- `prompt` for image generation.
- `model` (optional fal.ai model slug, defaults to `FAL_MODEL` env or `fal-ai/flux/schnell`).
- `stageId` for V2 stage approvals (`narrative`, `slides`, `prompts`, `export`).

## Steps
1. Resolve post metadata and linked source files from `content/tracker/index.json`.
2. Build deterministic input fingerprint (`promptHash`) from post + bundle content.
3. Execute requested generation step.
4. Persist run log to `content/runs/<post-id>/<run-id>.json`.
5. Persist generated artifacts to `content/artifacts/<post-id>/` unless `dryRun=true`.
6. Return run payload to UI/API caller.
7. For content variants: append `generation.variants[]` in post index metadata.
8. Apply to `draft.*` only via explicit `POST /api/content/apply`.
9. For image generation: build per-slide prompts from `Slide-by-Slide Copy` plus visual direction, call fal.ai per slide, save image binary to `content/artifacts/<post-id>/`, and write run log.
10. For `Content V2`: return a normalized workspace payload with stage availability, disabled reasons, grouped ready gates, and export links.

## Output Artifacts
- Run log JSON in `content/runs/`.
- Generated markdown/json in `content/artifacts/`.
- Generated image binaries (`.png`/`.jpg`/`.webp`) in `content/artifacts/`, typically one file per slide prompt run.
- Optional latest manifest pointer at `content/artifacts/<post-id>/manifest.latest.json`.

## Rollback and Retry Strategy
- **Retry**: rerun the same step (creates a new run, never overwrites old runs).
- **Rollback**:
  1. Identify desired previous artifact in `content/runs/<post-id>/`.
  2. Copy that artifact to active path (for manifest, update `manifest.latest.json`).
  3. Record the rollback run as a new run entry for traceability.
- **Variant rollback**:
  1. Select older variant from `generation.variants[]`.
  2. Re-apply it with `POST /api/content/apply`.
  3. Re-check checklist flags and approvals.

## Failure Modes
- Missing post ID in index.
- Invalid generation step.
- Missing linked file path for selected content section.
- Missing `FAL_KEY` for image generation endpoint.
- `ready` transition blocked by Definition of Ready checklist.

## Definition Of Ready Guard
A post can move to `ready` only if all checklist flags are `true`:
- `copyApproved`
- `coverApproved`
- `promptsReady`
- `storyPackReady`
- `captionAndCtaLocked`

## CMS Panels
- `Dashboard`: summary metrics and recent runs.
- `Content > Post Workspace`: tabs `Overview`, `Editor`, `AI Studio`, `Storyboard`, `Artifacts`.
- `Content V2`: separate safe workflow surface with stages `Brief`, `Narrative`, `Slides`, `Prompts`, `Images`, `Export / Review`.
- `Workflow`: queue of posts blocked by checklist/approvals.
- `Settings`: post-level editorial defaults (`tone`, `audience`, `constraints`).

## Content V2 API
- `GET /api/content-v2/workspace/:postId`
  - Returns one normalized workspace payload for the V2 screen.
  - Includes source content, draft content, grouped ready gates, stage availability, recent runs, and exportable image links.
- `POST /api/content-v2/narrative/generate`
  - Generates the narrative working draft from the source brief and writes it into `draft.copy`.
- `POST /api/content-v2/slides/generate`
  - Syncs `Slide-by-Slide Copy` into `draft.copy.slides`.
- `POST /api/content-v2/prompts/generate`
  - Builds `draft.prompts.coverPrompt` and `draft.prompts.slidePrompts`.
- `POST /api/content-v2/stages/approve`
  - Maps stage approvals to existing approvals/checklist fields so the low-level model stays compatible with the legacy UI.

## Verification
Pass criteria:
1. `npm run index` builds `content/tracker/index.json` without error.
2. `POST /api/generation/run` returns `status: success`.
3. A new run file appears in `runs/<post-id>/`.
4. Trying to set status to `ready` with incomplete checklist returns conflict (`409`).
5. Setting all checklist flags to true allows status transition to `ready`.
6. `POST /api/content/generate` appends a variant and creates a run/artifact.
7. `POST /api/content/apply` updates `draft.*` and does not overwrite source files.
8. `POST /api/images/generate` returns image metadata and writes an image file in `content/artifacts/<post-id>/`.
9. `GET /api/content-v2/workspace/:postId` returns stages, grouped ready gates, and export links.
10. `Content V2` buttons visibly enter a loading state and become discoverable again after completion.
