# Step 7 — Deep-dive template migration (path A)

**Branch:** `cursor/step-7-migrate`  
**Status:** legacy templates **kept** in UI allowlist until MP4 parity is confirmed.

Path A skips `canvas-from-css` (step 2). Migration means: export card CSS from Figma → **Import** (`POST /api/templates/import-css`) → edit draft in **Studio** → compare MP4 with the existing deep-dive folder → only then remove the legacy ID from `template-allowlist.js`.

---

## Workflow

```
Figma Dev Mode CSS (per card)
        ↓
/import.html → Import CSS (template ID, e.g. i-am-lavash-css-v1)
        ↓
POST /api/templates/import-css  (css-parse → componentize → LLM → content draft)
        ↓
Studio (/) — edit text, colors, upload images, save (PATCH content API)
        ↓
Run Render → content/artifacts/renders/<runId>/
        ↓
Visual compare card-01..07.png + video.mp4 vs legacy deep-dive render
        ↓
If OK: move ID in template-allowlist.js (see deprecation path below)
```

---

## Smoke notes — four deep-dive templates

Automated coverage: `test/deep-dive-migration-smoke.test.js` (folder integrity + lavash CSS fixture parse).  
MP4 comparison remains **manual** until reference renders are checked in.

| Template | Post | introLayout | Card 1 background | CSS fixture | Import smoke | MP4 parity |
|----------|------|-------------|-------------------|-------------|--------------|------------|
| **lavash** | 100 | `lavash` | `#D9DDE0` | `test/fixtures/lavash-card-1.css` | **pass** — parser + mock LLM map accent `#D61E23`, bg `#D9DDE0` | pending |
| **dolma** | 102 | `dolma` | `#4A7BFF` | — (export card-1 CSS from Figma) | pending — no fixture yet | pending |
| **matsun** | 101 | `matsun` | `#0F0F10` | — | pending — dark hello layout differs | pending |
| **khachkar** | — | `lavash` (shared hello) | `#D9DDE0` | reuse lavash hello CSS as starting point | pending | pending |

### Per-series checklist

1. Export **card 1** CSS from Figma (1080×1350) for the series.
2. Import with a **new** template ID (do not overwrite legacy folder yet).
3. In Studio: paste texts from `content.example.json` of the legacy template; upload images from `public/templates/<legacy>/images/`.
4. Run Render for legacy + imported IDs with the same texts/assets.
5. Compare `card-01.png` (hello) and one quote card — layout, colors, type scale.
6. If acceptable: add imported ID to `PENDING_CSS_IMPORT_TEMPLATE_IDS`, remove legacy ID from `LEGACY_DEEP_DIVE_TEMPLATE_IDS` in `template-allowlist.js`.
7. After one release cycle with no regressions: delete legacy template folder (optional, not required for step 7).

### Lavash (reference smoke)

- Fixture `lavash-card-1.css` matches hello-card tokens from `i-am-lavash-deep-dive/content.example.json`.
- `importCssToTemplate` with mock LLM returns `introLayout: "lavash"` and matching palette (see `css-import-service.test.js`).
- **Next:** run live import with `OPENAI_API_KEY`, save via Studio, render both `i-am-lavash-deep-dive` and imported ID.

### Dolma

- Hello card uses blue `#4A7BFF` / accent `#FFC53A` — CSS variables must be extracted; lavash fixture is **not** interchangeable.
- Assets: `templates/i-am-dolma-deep-dive/images/102_*.png`.

### Matsun

- Dark hello `#0F0F10`, accent `#FFCE50`; title uses newline in `HELLO,\nI AM`.
- Verify Studio preserves `\n` in title after import.

### Khachkar

- Reuses lavash hello layout (`introLayout: "lavash"`); quote/brand content differs.
- Assets under `templates/i-am-khachkar-deep-dive/images/` (not `generated/`).

---

## Deprecation path (`template-allowlist.js`)

1. **Now:** all four IDs stay in `LEGACY_DEEP_DIVE_TEMPLATE_IDS` → visible in Studio/Import.
2. **After parity:** imported ID added to `PENDING_CSS_IMPORT_TEMPLATE_IDS`; matching legacy ID removed from `LEGACY_DEEP_DIVE_TEMPLATE_IDS`.
3. **Later:** delete `apps/helloiam-remotion/src/templates/i-am-*-deep-dive/` only when team signs off (not part of minimal step 7).

Do **not** remove `green-plate-intro` from `INTERNAL_TEMPLATE_DIRS` — imported drafts on path A still render through the shared TSX until path B (`canvas-from-css`) ships.

---

## Commands

```bash
cd apps/post-ops-ui
npm test                                    # includes migration smoke tests
npm start                                   # Studio + Import on :4242

# Optional live LLM import (requires OPENAI_API_KEY in .env)
OPENAI_API_KEY=... npm test                 # runs integration test too
```
