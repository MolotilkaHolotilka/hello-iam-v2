# I Am Streets Intro

6-карточная карусель 1080×1350 для поста 012 (`I AM _ STREETS`, Category Map).

- card1 (Hello, красный): "HELLO, I AM STREETS" + фото-фон `012_1.png`
- card2–5 (Quote, серый): фото `012_2..012_5.png` + цитата по слайдам 2-5
- card6 (Brand, серый): "helloiam [emoji-balcony] am"

Шаблон переиспользует логику из `green-plate-intro/template.tsx`.

## Что положить перед рендером

В `apps/helloiam-remotion/public/generated/`:
- `012_1.png` ... `012_5.png` — фото слайдов
- `emoji-balcony.png` — уже скопирован

## Композиция

`TemplateRenderPortrait` (1080×1350, 540 кадров = 6 × 90 кадров, 30 fps, 18 секунд).
При `splitVideos: true` отдельный MP4 на каждую карточку.
