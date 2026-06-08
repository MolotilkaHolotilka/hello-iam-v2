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
- **Render** — pick template, content JSON file, run Remotion render
- **_dev** — content cards editor (dev tooling)
- **Template assets** — upload images/stickers per template

If port `4242` is busy:

```bash
PORT=4444 npm --prefix apps/post-ops-ui run start
```

## Structure

- `apps/post-ops-ui/` — UI + API server
- `apps/helloiam-remotion/` — Remotion templates
- `content/` — posts, tracker, render artifacts

## Deploy

See `DEPLOY.md` for Hostinger VPS + Docker.
