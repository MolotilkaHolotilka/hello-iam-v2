# Post-ops UI — technical runbook

## What runs

Single Node server (`apps/post-ops-ui`) on port **4242**:

| Surface | Purpose |
|---------|---------|
| `/` | **Studio** — template picker, Card 1–7 props editor, HTML preview, save, Run Render |
| `/import.html` | **Import** — JSON file from disk, manual image paths, **Import CSS** (Figma → draft) |
| `/dev.html` | Legacy content cards editor (dev) |
| `/assets.html` | Template image/sticker uploads |

Remotion CLI (`apps/helloiam-remotion`) is spawned as a child process for still/video renders.

## Key API routes

- `GET /api/templates` — list render templates (filtered by `template-allowlist.js`)
- `GET /api/templates/:id/content` — load `content.example.json` + mapping + workflow
- `PATCH /api/templates/:id/content` — save Studio edits to disk
- `POST /api/templates/import-css` — parse CSS → LLM map → draft content (requires `OPENAI_API_KEY` for live calls)
- `POST /api/render` — run Remotion render
- `GET/POST/DELETE /api/templates/:id/assets/:bucket` — template media
- `POST /api/index/rebuild` — rebuild `content/tracker/index.json`

## Local dev

```bash
npm run index
npm start
```

## Render performance tuning

Remotion is spawned via CLI from `remotion-render-service.js`. Still (PNG) frames run one subprocess at a time; **video** `render` commands pass `--concurrency` so Remotion can encode multiple frames in parallel.

| Variable | Effect |
|----------|--------|
| `REMOTION_CONCURRENCY` | Parallel frame workers for `render` only (not `still`). Unset: **6**. |

**MacBook (local):** default concurrency is 6; thermal throttling and other apps can still slow renders. Templates with `splitVideos` run **7 still + 7 render** subprocesses sequentially — concurrency helps each MP4 pass, not the count of passes.

**VPS (Linux):** dedicated cores and cooler sustained load often beat a laptop even at similar concurrency.

Override if needed (lower on a hot laptop, higher on a VPS):

```bash
export REMOTION_CONCURRENCY=4   # example: reduce on MacBook under load
npm start
```

One-shot override from the shell:

```bash
REMOTION_CONCURRENCY=8 npm start
```

Watch server logs for `starting video render (concurrency=N)` to confirm the value in use.

Tests (CSS parser, allowlist, migration smoke):

```bash
npm test --prefix apps/post-ops-ui
```

## Content paths

- Posts: `content/posts/`
- Tracker: `content/tracker/`
- Render output: `content/artifacts/renders/`
- Template media: `apps/helloiam-remotion/public/templates/`

## Template allowlist

Public templates are defined in `apps/post-ops-ui/src/lib/template-allowlist.js`.  
Legacy deep-dive IDs (lavash, dolma, matsun, khachkar) stay visible until MP4 parity — see `docs/MIGRATION_STEP7.md`.
