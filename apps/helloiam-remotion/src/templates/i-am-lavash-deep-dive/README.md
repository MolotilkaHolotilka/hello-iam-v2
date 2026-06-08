# I Am Lavash Deep Dive

7-карточная карусель 1080×1350 для поста 100 (`I AM _ LAVASH`, Deep Dive).

- card1 (Hello, красный): "HELLO, I AM LAVASH" + `100_1.png`
- card2–6 (Quote, серый): `100_2..100_6.png` + тексты слайдов 2–6 из production-файла
- card7 (Brand, серый): "helloiam [100_emoji] am"

Шаблон переиспользует `green-plate-intro/template.tsx`.

## Ассеты

В `apps/helloiam-remotion/public/generated/`:
- `100_1.png` … `100_6.png`
- `100_emoji.png`

## Композиция

`TemplateRenderPortrait` (7 × 210 кадров = 7 сек/карточка, 30 fps, 49 сек всего). `splitVideos: true` — отдельный MP4 на карточку. Без fade-out в конце кадра.
