# I Am Food Intro

7-карточная карусель 1080×1350 для поста 010 (`I AM _ FOOD`, Category Map).

- card1 (Hello, красный): "HELLO, I AM FOOD" + фото-фон `010_1.png`
- card2–6 (Quote, серый): фото `010_2..010_6.png` + цитаты по слайдам 2-6
- card7 (Brand, серый): "helloiam [010_emoji] am"

## Что положить перед рендером

В `apps/helloiam-remotion/public/generated/`:
- `010_1.png` ... `010_6.png` — 6 фото
- `010_emoji.png` — эмодзи бренда

## Композиция

`TemplateRenderPortrait` (1080×1350, 630 кадров = 7 × 90, 30 fps, 21 секунда).
При `splitVideos: true` отдельный MP4 на каждую карточку.
