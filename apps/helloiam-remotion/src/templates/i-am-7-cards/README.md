# I Am — 7 Cards Carousel

Универсальный 7-карточный шаблон карусели для Instagram (1080×1350, портрет 4:5).

**Структура:**
- Card 1 — Hello (красный экран с заголовком `HELLO, I AM <TITLE>`)
- Card 2–6 — Quote (фото слайда + цитата)
- Card 7 — Brand (логотип `helloiam ... am` + эмодзи)

По умолчанию загружен контент поста 010 (I AM FOOD). Для других постов меняй текст и пути к ассетам через UI или CLI:

- Все ассеты живут в `apps/helloiam-remotion/public/posts/<postId>/`.
- В `content.example.json` пути формата `posts/<postId>/<file>.png`.

Под капотом — реэкспорт `GreenPlateIntroTemplate`.
