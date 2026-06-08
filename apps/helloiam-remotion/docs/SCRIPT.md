# SCRIPT — Post `001` «I AM _» (Reels 9:16)

Canon and editorial tone: see repo root [`00_PROJECT_CANON.md`](../../../00_PROJECT_CANON.md). Shot timing matches [`content/storyboards/001_first-hello_i-am.md`](../../../content/storyboards/001_first-hello_i-am.md).

## Output spec

| Field | Value |
| --- | --- |
| Composition ID | `HelloIamPost001` |
| Resolution | 1080 × 1920 |
| FPS | 30 |
| Approx. duration | **12.0 s** (360 frames) |

## Safe typography zone

Primary captions sit in the lower band (`paddingBottom ≈ 22%` of height) to stay above persistent Reels UI. Avoid packing glyphs into the bottom ~140 px strip once handset chrome appears.

## Asset naming (`public/frames/`)

Replace placeholders while keeping filenames stable:

| File | Narrative role |
| --- | --- |
| `001-shot-01.svg` | Warm surface / drifting light |
| `001-shot-02.svg` | Linen, paper, stone crops |
| `001-shot-03.svg` | Metal gleam + bread-adjacent shadow |
| `001-shot-04.svg` | Resolved editorial tableau |
| `001-shot-05.svg` | Slightly wider field suggesting territories |
| `001-shot-06.svg` | Final held cover |

Use PNG/WebP exports when handing off final art — update `asset` fields in [`src/compositions/post001.ts`](../src/compositions/post001.ts) if extensions change.

## Beat sheet

| # | Duration | On-screen copy | Transition in (prev → this) | Transition out |
| --- | --- | --- | --- | --- |
| 1 | 2.0 s | `I AM _` | fade in from negative space | soft cut |
| 2 | 1.8 s | `Not a slogan.` | soft cut | soft cut |
| 3 | 1.8 s | `A first hello.` | dissolve | dissolve |
| 4 | 2.2 s | `A phrase that opens into a world.` | cut | cut |
| 5 | 2.0 s | `Food. Streets. Rituals. Objects. Sounds.` | dissolve | dissolve |
| 6 | 2.2 s | `This is where that world starts to open.` | dissolve | fade to finish |

## Sound direction

Quiet room tone, tactile micro-Foley (paper/cloth/object touches). Music stays absent or barely perceptible — pacing relies on silence and texture hits aligned with cuts/dissolves.

## Implementation hooks

- Core timings live in [`src/compositions/post001.ts`](../src/compositions/post001.ts).
- Frame-normalised fades/drift/text settle helpers live in [`src/motion/motionPrimitives.ts`](../src/motion/motionPrimitives.ts) — mirror presets from external motion libraries there.
