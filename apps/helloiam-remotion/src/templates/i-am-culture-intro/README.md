# I Am Culture Intro

7-карточная карусель 1080×1350 для поста 011 (`I AM _ CULTURE`, Category Map).

- card1 (Hello, красный): "HELLO, I AM CULTURE" + фото-фон `011_1.png`
- card2–6 (Quote, серый): фото `011_2..011_6.png` + цитаты по слайдам 2-6 (khachkar, tonir, toasts, backgammon/fountains, closing)
- card7 (Brand, серый): "helloiam [011_emoji] am"

## Что положить перед рендером

В `apps/helloiam-remotion/public/generated/`:
- `011_1.png` ... `011_6.png` — 6 фото
- `011_emoji.png` — эмодзи бренда (khachkar)

## Композиция

`TemplateRenderPortrait` (1080×1350, 630 кадров = 7 × 90, 30 fps, 21 секунда).
При `splitVideos: true` отдельный MP4 на каждую карточку.
