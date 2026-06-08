# Post-ops UI — technical runbook

## What runs

Single Node server (`apps/post-ops-ui`) on port **4242**:

| Surface | Purpose |
|---------|---------|
| `/` | Remotion render MVP — template, content JSON file, run render |
| `/dev.html` | Content cards editor (dev) |
| `/assets.html` | Template image/sticker uploads |

Remotion CLI (`apps/helloiam-remotion`) is spawned as a child process for still/video renders.

## Key API routes

- `GET /api/templates` — list render templates
- `POST /api/render` — run Remotion render
- `GET/POST/DELETE /api/templates/:id/assets/:bucket` — template media
- `POST /api/index/rebuild` — rebuild `content/tracker/index.json`

## Local dev

```bash
npm run index
npm start
```

## Content paths

- Posts: `content/posts/`
- Tracker: `content/tracker/`
- Render output: `content/artifacts/renders/`
- Template media: `apps/helloiam-remotion/public/templates/`
