# Work status — путь A

**Split:** Codex = продукт | Cursor = CSS/LLM infra. [PARALLEL_IDE.md](PARALLEL_IDE.md)

| Шаг | Задача | OWNER | Priority | BRANCH | Status |
|-----|--------|-------|----------|--------|--------|
| 3 | Props editor на главной | **codex** | **P0** | `codex/step-3-studio` | implemented locally |
| 4 | Content API + wire save | **codex** | **P0** | `codex/step-3-studio` | implemented locally |
| 1 | Import page | **cursor** | P1 | `cursor/takeover-codex-1-6b` | done (verified) |
| 6b | Import CSS UI | **cursor** | P2 | `cursor/takeover-codex-1-6b` | done (verified) |
| 2 | Canvas Remotion | — | — | — | **skipped** |
| 5 | CSS parser (postcss) | **cursor** | P1 | `cursor/step-5-css-parser` | done |
| 6a | LLM + import-css API | **cursor** | P1 | `cursor/step-6a-import-css` | done |
| 7 | allowlist + docs | **cursor** | P2 | `cursor/step-7-migrate` | done |

---

## Старт

| IDE | Начать с |
|-----|----------|
| **Codex** | **Шаг 3** (props editor) → шаг 4 → шаг 1 |
| **Cursor** | **Шаг 5** (параллельно, не мешает Codex) |

---

## Changelog

| Date | Who | What |
|------|-----|------|
| 2026-06-08 | — | Codex: P0 шаги 3+4; Cursor: infra 5/6a/7 |
| 2026-06-08 | Cursor | Step 5: postcss CSS parser + componentizer + tests on `cursor/step-5-css-parser` |
| 2026-06-08 | Cursor | Step 6a: LLM mapper + POST /api/templates/import-css on `cursor/step-6a-import-css` |
| 2026-06-08 | Codex | Claimed steps 3+4 on `codex/step-3-studio` |
| 2026-06-08 | Codex | Implemented Studio props editor + `GET/PATCH /api/templates/:id/content` locally |
| 2026-06-08 | Codex | Implemented Import page + Import CSS UI on `codex/step-1-import` |
| 2026-06-08 | Cursor | Step 7: allowlist deprecation path, MIGRATION_STEP7.md, docs, smoke tests on `cursor/step-7-migrate` |
| 2026-06-08 | Cursor | Takeover Codex steps 1+6b on `cursor/takeover-codex-1-6b`; tests 14 pass |
| 2026-06-08 | Cursor | Studio Quick render toggle (1 card, PNG only) on `cursor/step-7-migrate` |
