# HELLOIAM.AM Launch Workspace

This workspace powers content operations and post generation for `HELLOIAM.AM`.

## Start Here in 30 sec
From workspace root:

```bash
npm run index
npm start
```

Then open:
- `http://localhost:4242`

## fal.ai Local Image Generation
The app now supports local image generation via `fal.ai` from the Prompt Builder tab.

**Recommended:** create `apps/post-ops-ui/.env` (see `apps/post-ops-ui/.env.example`). The server loads it on startup.

```bash
cp apps/post-ops-ui/.env.example apps/post-ops-ui/.env
# Edit apps/post-ops-ui/.env — set FAL_KEY from https://fal.ai/dashboard
```

Alternatively, export variables in your shell for that session:

```bash
export FAL_KEY="your_fal_key_here"
```

Optional:

```bash
export FAL_MODEL="fal-ai/flux/schnell"
```

Run the app in the same shell session where `FAL_KEY` is set:

```bash
npm run index
npm start
```

Usage in UI:
1. Open `Content` and select a post.
2. Go to step `3. Prompt Builder`.
3. Click `Build Slide Prompts`.
4. Each slide will show:
   - the slide text,
   - a slide-specific image prompt,
   - its own `Generate Image (fal.ai)` button.
5. Generate images per slide as needed.
6. Each image is saved to `content/artifacts/<postId>/` and previewed in the app.

## Content V2
The app now also ships with a separate `Content V2` screen that keeps the original `Content` tab intact.

Use `Content V2` when you want:
- explicit stages instead of raw checklist flags,
- visible disabled reasons before clicking,
- per-button loading/success/error feedback,
- direct `Open fal result` / `Open local copy` links,
- export/review grouped by slide.

V2 stage flow:
1. `Brief` - source markdown only.
2. `Narrative` - generate and approve the working copy draft.
3. `Slides` - sync slide text into draft and approve it.
4. `Prompts` - build prompt draft from slides and approve it.
5. `Images` - choose a model and generate per-slide images.
6. `Export / Review` - review links and mark export ready.

Workflow note:
- The raw tracker status still exists and can still be edited.
- In V2, checklist flags are grouped by stage so `storyPackReady` and related gates are no longer shown as isolated low-level controls.

If port `4242` is already busy:

```bash
PORT=4444 npm --prefix apps/post-ops-ui run start
```

Then open:
- `http://localhost:4444`

First-click workflow:
1. Go to `Content`.
2. Select a post row (e.g. `013`).
3. Step `0` -> `Generate Narrative from Brief`.
4. In `Variants History`, click `Apply to draft`.
5. Continue through steps `1 -> 4`.

## New Top-Level Structure
- `apps/post-ops-ui/` application code (UI + local API).
- `content/` source content, templates, tracker, runs, artifacts.
- `docs/` runbooks and migration/architecture notes.
- `archive/` legacy material.

## Where To Work
- Edit post content in `content/posts/`.
- Edit storyboards in `content/storyboards/`.
- Track production state in `content/tracker/07_LAUNCH_TRACKER.md`.
- Use templates from `content/templates/`.

## Run The App
From workspace root:

```bash
npm run index
npm start
```

This delegates to `apps/post-ops-ui`.

## Read In This Order
1. `00_PROJECT_CANON.md`
2. `01_INSTAGRAM_START_SYSTEM.md`
3. `02_CONTENT_RUBRICS.md`
4. `03_WEEKLY_RHYTHM.md`
5. `content/tracker/07_LAUNCH_TRACKER.md`
6. `09_WORK_PLAN.md`
7. `10_FIRST_36_POSTS.md`
8. `12_IMAGE_PROMPT_SYSTEM.md`

## Templates
- `content/templates/04_POST_BRIEF_TEMPLATE.md`
- `content/templates/05_STORYBOARD_TEMPLATE.md`
- `content/templates/06_STORY_PACK_TEMPLATE.md`
- `content/templates/08_VIDEO_MANIFEST_TEMPLATE.json`

## Content Storage
- `content/posts/`
- `content/storyboards/`
- `content/tracker/index.json`
- `content/runs/`
- `content/artifacts/`

## Ops Docs
- `docs/content-system/MIGRATION_MAP.md`
- `docs/ops/POST_GENERATION_RUNBOOK.md`
- `docs/ops/CONTENT_V2_HANDOFF.md` (current UI handoff for the next Content V2 pass)
- `apps/post-ops-ui/src/RUNBOOK_POST_GENERATION.md` (canonical technical runbook)

## Next Actions
- Keep all new content assets under `content/`.
- Keep application changes under `apps/post-ops-ui/src/`.
- Use `docs/content-system/MIGRATION_MAP.md` when updating legacy path references.
