# HELLOIAM.AM Launch Workspace

Content operations and Remotion render for `HELLOIAM.AM`.

## Quick start

From workspace root:

```bash
npm run index
npm start
```

Open `http://localhost:4242`

Pages:
- **Studio** (`/`) — pick template, edit cards (text, colors, images), preview, save, run Remotion render
- **Import** (`/import.html`) — load JSON from disk, paste image paths, **Import CSS** (Figma → draft content)
- **_dev** — legacy content cards editor (dev tooling)
- **Template assets** — upload images/stickers per template

**New series (path A):** export card CSS from Figma → Import → refine in Studio → Run Render. Day-to-day posts only touch Studio (`content.json` props). See [docs/MIGRATION_STEP7.md](docs/MIGRATION_STEP7.md).

If port `4242` is busy:

```bash
PORT=4444 npm --prefix apps/post-ops-ui run start
```

## Structure

- `apps/post-ops-ui/` — UI + API server (Studio, Import, CSS import API)
- `apps/helloiam-remotion/` — Remotion templates (`green-plate-intro` + four deep-dive series)
- `content/` — posts, tracker, render artifacts
- `docs/CANVAS_MVP_PLAN.md` — 7-step Canvas MVP plan (path A)
- `docs/MIGRATION_STEP7.md` — deep-dive migration smoke notes

## Tests

```bash
npm test --prefix apps/post-ops-ui
```

## Deploy

See `DEPLOY.md` for Hostinger VPS + Docker.
