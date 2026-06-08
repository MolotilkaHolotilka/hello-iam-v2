# HELLOIAM.AM — Онбординг

Привет. Этот файл — стартовая точка для нового человека в проекте. Открыл Claude Code в этой папке → скажи ему «начнём» → дальше можешь возвращаться сюда за конкретикой.

---

## 1. Что это вообще такое

Проект делает контент для Instagram [@helloiam.am](https://instagram.com/helloiam.am) — про армянскую гастро-культуру, объекты, улицы, ритуалы. Каждый пост — карусель из 7 карточек 1080×1350 (формат IG portrait), и/или видео из тех же карточек.

Контент собирается **не в графическом редакторе**, а из двух кусков:
- **JSON** с текстами и путями к ассетам;
- **Remotion-шаблон** (React-компонент), который превращает этот JSON в PNG/MP4.

Вход — текстовый бриф + фотографии и эмодзи. Выход — готовая карусель и MP4-видео для постинга.

Между ними — два приложения внутри репо:
- [apps/post-ops-ui/](apps/post-ops-ui/) — Node + Express + web-UI на localhost:4242. Это твоё **главное окно работы**.
- [apps/helloiam-remotion/](apps/helloiam-remotion/) — Remotion-приложение со шаблонами и движком рендера. UI дёргает его через CLI.

---

## 2. Быстрый старт (за 1 минуту)

**Prerequisites:** Node.js ≥ 18 (лучше 20), npm. После `git clone` поставь зависимости (теперь `node_modules/` в `.gitignore`):

```bash
npm install --prefix apps/post-ops-ui
npm install --prefix apps/helloiam-remotion
```

Если получаешь проект как zip-архив со всеми папками — в нём `node_modules/` уже может быть, тогда `npm install` пропускай.

**Ветка:** main на GitHub — актуальная. Локально работа обычно идёт в `merged-v0001`. После клона ты автоматически на `main`, этого достаточно.

**Запуск:**

```bash
npm run index    # пересобрать индекс постов (быстро, обязательно при первом запуске)
npm start        # поднять UI на http://localhost:4242
```

Открой [http://localhost:4242](http://localhost:4242), увидишь рабочую панель. Если порт занят:

```bash
PORT=4444 npm --prefix apps/post-ops-ui run start
```

Для интерактивного превью Remotion-шаблона (НЕ обязательно для повседневной работы):

```bash
npm run remotion         # Remotion Studio на отдельном порту
```

---

## 3. Что лежит и зачем

```
.
├── apps/
│   ├── post-ops-ui/                       # UI + локальный API
│   └── helloiam-remotion/
│       ├── src/templates/                 # все Remotion-шаблоны (одна папка = один шаблон)
│       │   ├── green-plate-intro/         # базовый шаблон карусели (7 карточек)
│       │   ├── i-am-food-intro/           # пост 010 (re-export green-plate)
│       │   ├── i-am-culture-intro/        # пост 011
│       │   ├── i-am-streets-intro/        # пост 012
│       │   ├── i-am-wine-deep-dive/       # пост 103
│       │   └── asset-role-smoke-test/     # тестовый шаблон (image + video + emoji)
│       └── public/generated/              # сюда кладёшь фотки и эмодзи (.png/.mp4)
├── content/
│   ├── posts/                             # markdown-брифы постов (001..103)
│   ├── tracker/index.json                 # состояние всех постов (UI его читает)
│   ├── storyboards/                       # storyboards
│   ├── runs/                              # неизменяемые логи генераций
│   └── artifacts/                         # результаты: картинки, рендеры, MP4
├── scripts/
│   └── render-all-posts.mjs               # батч-скрипт: дёргает /api/render для всех постов подряд
├── Stas Assets for Posts/                 # сырьё от дизайнера (исходники по postId, 118 MB)
├── hiam-smm-launch.pen                    # design file для редактора Pencil (через MCP). Не обязателен
├── CLAUDE.md                              # подробные инструкции для Claude (читает автоматически)
├── README.md                              # квикстарт (короче этого файла)
└── ONBOARDING.md                          # ты сейчас читаешь это
```

`Stas Assets for Posts/` — это **архив исходников до перекладки в рендер-папку**. Финальные ассеты для рендера всё равно должны лежать в `apps/helloiam-remotion/public/generated/`. Если делаешь новый пост — бери сырьё отсюда, фильтруй/обрабатывай, копируй конечную версию в `public/generated/` под нужным именем (`XXX_1.png` … `XXX_emoji.png`).

**Главное правило путей:** все ассеты для рендера лежат в `apps/helloiam-remotion/public/generated/`, а в JSON указываются **без `public/` и без ведущего слэша**: `"generated/010_1.png"`.

---

## 4. Три сценария работы (как ты будешь это использовать)

Открыл Claude Code и хочешь что-то сделать — выбери один из трёх режимов ниже и скажи Claude фразу, похожую на ту, что в подзаголовке.

### Сценарий A: «Сделай пост из готового PRODUCTION_FILE» (быстрый путь)

**Когда:** у тебя уже есть готовый `XXX_PRODUCTION_FILE.md` (где XXX = `010`, `012` и т.д.) + 7 PNG-ассетов: `XXX_1.png … XXX_6.png` + `XXX_emoji.png`.

**Что сказать Claude:** «Сделай пост 010 из production-файла».

**Что произойдёт:**
1. Claude прочитает `apps/helloiam-remotion/public/generated/010_PRODUCTION_FILE.md`.
2. Создаст папку шаблона `src/templates/i-am-<slug>-intro/` (или обновит существующую) — 5 файлов: `template.tsx`, `workflow.json`, `mapping.example.json`, `content.example.json`, `README.md`.
3. Шаблон `template.tsx` — это **одна строка-реэкспорт** из `green-plate-intro`; визуально все 7-карточные посты сейчас выглядят одинаково и различаются только контентом и цветами.
4. После этого тебе нужно: открыть UI → выбрать шаблон в селекте → нажать **Run Render**.

**Что нужно положить заранее:**
- `apps/helloiam-remotion/public/generated/XXX_PRODUCTION_FILE.md`
- `apps/helloiam-remotion/public/generated/XXX_1.png` … `XXX_6.png` (фотки слайдов 1–6)
- `apps/helloiam-remotion/public/generated/XXX_emoji.png` (эмодзи на финальный slide)

**Если ассетов нет** — Claude скажет тебе их положить и не будет ничего рендерить.

**Формат PRODUCTION_FILE.md** (см. живой пример: [010_PRODUCTION_FILE.md](apps/helloiam-remotion/public/generated/010_PRODUCTION_FILE.md)):
- `Metadata` — Post ID, Public title, Rubric, Week (используется для генерации `slug` и `TITLE`)
- `Purpose` — зачем пост существует (для AI-генерации текстов, если нужна)
- `One-Line Thesis` — главный месседж в одну фразу
- `Hook` — обычно совпадает с Public title (`I AM _ FOOD`)
- `Caption` + `CTA` — текст подписи в Instagram (НЕ попадает в карточки)
- `Slide Text` — 7 блоков (слайды 1–7). Слайд 1 = Hello-карточка (обычно только TITLE/IMAGE), слайды 2–6 = текст цитат на Quote-карточках, слайд 7 = Brand-карточка (обычно пустой текст)

Claude парсит `Public title` → `accent` (например `FOOD`/`STREETS`) и блоки 2–6 → `quote` поля карточек.

### Сценарий B: «Новый дизайн шаблона»

**Когда:** карусель 7 карточек 1080×1350 не подходит — нужен другой layout, другой формат (например, 1080×1920 для stories), другая анимация.

**Что сделать:** дай Claude **скриншот мокапа** (любой формат — Figma export, рисунок, фото) и опиши слоты словами: «верхняя плашка — заголовок, фон — фото, внизу — лейбл и эмодзи».

**Что сделает Claude:** напишет новый `template.tsx` (React-компонент с Remotion-примитивами), создаст всю обвязку (workflow.json/mapping.example.json/content.example.json), при необходимости добавит новую `<Composition>` в [Root.tsx](apps/helloiam-remotion/src/Root.tsx) для нестандартного размера и пропишет длительность в [remotion-render-service.js](apps/post-ops-ui/src/services/remotion-render-service.js) в `COMPOSITION_DURATIONS`.

---

## 5. Что давать Claude на вход

В порядке «достаточности» — чем больше, тем меньше ему придётся угадывать.

| Что | Где взять | Зачем |
|---|---|---|
| **PRODUCTION_FILE.md** | сам пишешь или есть в `public/generated/` | даёт postId, заголовок (`FOOD`/`STREETS`/...), тексты слайдов 1–6, brand-card |
| **6 фоток слайдов** | готовишь вручную или внешними инструментами | визуальная начинка карточек 2–6 (на квадратах 1024×645) |
| **1 эмодзи-картинка** | png 512×512 минимум, прозрачный фон желательно | финальная brand-карточка |
| **скриншот мокапа** | Figma/Pencil/фото | только для Сценария C — новый шаблон |
| **бриф `.md` поста** | `content/posts/XXX_*.md` | исходник для текстов и трекера |

Минимум для Сценария A: `XXX_PRODUCTION_FILE.md` + 7 PNG. Всё.

---

## 6. Как выглядит контент-карточка изнутри (полезно понимать)

Шаблон `green-plate-intro` — это **одна React-функция**, которая получает массив карточек и в каждый момент времени рисует одну из них. Какую — решается **по индексу**:

- `card1` (индекс 0) → **Hello-карточка** (красный фон, огромный заголовок, фото на фоне).
- `card2..card6` (средние индексы) → **Quote-карточки** (серый фон, мини-заголовок, фото в прямоугольнике, цитата серифом).
- `card7` (последний индекс) → **Brand-карточка** (серый фон, `helloiam [emoji] am`).

То есть **тип карточки определяется её позицией**, а не отдельным полем. Если ты сделаешь `cardCount: 6`, то brand-карточка переедет на 6-ю позицию. Если 3 — на 3-ю.

В `content.example.json` карточка выглядит так:

```json
{
  "title": "HELLO,\nI AM",
  "titleAccent": "FOOD",
  "label": "AM FOOD",
  "image": "generated/010_1.png",
  "assetRole": "image",
  "background": "#d61e23",
  "titleColor": "#ffffff",
  "accentColor": "#ffce1f"
}
```

В `mapping.example.json` те же поля прокидываются в слоты шаблона:

```json
{
  "card1.title": "cards[0].title",
  "card1.image": "cards[0].image",
  "card1.assetRole": "cards[0].assetRole"
}
```

Это разделение даёт гибкость: один и тот же `cards[]` массив можно подать в разные шаблоны.

---

## 7. Видео внутри карточки (assetRole: "video")

В шаблоне `green-plate-intro` есть универсальный компонент **Media**, который смотрит на `assetRole` карточки:

- `assetRole: "video"` (или путь оканчивается на `.mp4/.webm/.mov`) → рендерится через Remotion-компонент `<Video>` (muted, loop). Видео реально проигрывается внутри карточки во время рендера MP4.
- иначе → рендерится через `<Img>`.

Минимальный пример карточки с видео:

```json
{
  "title": "I AM _ STREETS",
  "video": "generated/streets-bgm.mp4",
  "assetRole": "video",
  "quote": "City sound on the inside of a winter coat.",
  "label": "AM STREETS",
  "background": "#d9dde0",
  "quoteColor": "#d61e23"
}
```

Можно положить путь в поле `image` вместо `video` — оба читаются (`mediaPath` = `card.video || card.image`).

**Эмодзи** — это **не отдельный тип ассета**, а просто `image` на brand-карточке. `assetRole: "emoji"` есть в JSON как метка, но визуально решает положение (последний слот = brand-card с размером 180×180), а не само поле.

---

## 8. Smoke-test (как убедиться что движок жив)

В репо есть готовый шаблон [asset-role-smoke-test/](apps/helloiam-remotion/src/templates/asset-role-smoke-test/) — 3 карточки, по одной на каждый `assetRole`:

- card 1 → `assetRole: "image"` (статичная картинка)
- card 2 → `assetRole: "video"` (видеофайл)
- card 3 → `assetRole: "emoji"` (картинка-эмодзи)

**Что сказать Claude:** «Прогони asset-role-smoke-test и покажи мне card-02.png». Он подаст полный payload в `/api/render`, дождётся завершения, откроет PNG визуально и подтвердит что `<Video>` сработал (внутри card-02 виден кадр из mp4, а не broken image).

Использовать перед тем как делать новый большой пост — если smoke-test ломается, не трать время на остальное.

---

## 9. Команды-шпаргалка

```bash
# Главное
npm run index                    # пересобрать content/tracker/index.json
npm start                        # UI на http://localhost:4242

# Remotion (превью шаблона)
npm run remotion                 # Remotion Studio
npm run remotion:render          # CLI-рендер

# Если что-то сломалось
cd apps/post-ops-ui && npm install
cd apps/helloiam-remotion && npm install
```

**Батч-рендер всех постов** (если хочешь сделать всё за один прогон):

```bash
npm start &                                    # UI должен крутиться
node scripts/render-all-posts.mjs              # дёрнет /api/render для всех постов из своего списка
```

Скрипт [scripts/render-all-posts.mjs](scripts/render-all-posts.mjs) содержит захардкоженный список постов с цитатами (010, 011, 012, ...). Результаты он пишет в `render-all-results.json` (этот файл в `.gitignore`).

Render через API напрямую (когда UI открыт):

```bash
curl -X POST http://localhost:4242/api/render \
  -H "Content-Type: application/json" \
  -d '{"templateId":"i-am-food-intro","mapping":{...},"content":{...},"workflow":{...},"animationPreset":"clean-rise"}'
```

⚠️ **Важно:** POST с одним только `templateId` (без `mapping`/`content`) **молча подсунет дефолтный шаблон custom-jsx и отрендерит чужой контент**. Это известный косяк сервиса — всегда отправляй все три объекта.

---

## 10. Куда сохраняется результат

Каждый рендер создаёт папку `content/artifacts/renders/<runId>/` (runId = таймстамп + случайный хвост) со следующим содержимым:

```
content/artifacts/renders/2026-05-16T10-18-38-335Z-58bc04bd/
├── props.json              # точные пропсы, с которыми рендерил шаблон
├── still.png               # копия первой карточки (для совместимости)
├── card-01.png             # карточка 1 (Hello)
├── card-02.png             # карточка 2 (Quote/Video)
├── ...
├── card-07.png             # карточка 7 (Brand)
├── video.mp4               # карусель целиком (на самом деле дубль первого split-куска)
├── video-card-01.mp4       # сегмент видео по карточке 1
├── video-card-02.mp4       # сегмент по карточке 2
└── ...
```

`video-card-XX.mp4` файлы создаются только если в `workflow.json` стоит `splitVideos: true` (по умолчанию для 7-карточных постов).

Old runs **не удаляй** — они служат rollback'ом. Если нужно «откатить» пост, просто перелинкуй на старый runId, не стирай.

---

## 11. Что НЕ ломать без причин

- **`content/runs/*.json`** — иммутабельные логи генераций. Новый ран = новый ID.
- **`content/tracker/index.json`** — пересобирается через `npm run index`, сохраняет ручные правки (статусы, approvals). Не редактируй руками без необходимости.
- **`apps/helloiam-remotion/src/templates/registry.ts`** — генерится автоматически при вызове `/api/templates`. Если правишь руками — следующий запрос его перепишет.
- **`.env`** — никогда не коммить, если появятся локальные секреты.

---

## 12. Стиль контента (важно для AI-генерации)

Бренд-голос:
- **документальный, тактильный, наблюдаемый** — а не «рекламно-туристический»;
- **конкретные предметы и жесты**, не общие слова про «солнечную Армению»;
- **никаких** ярмарочно-фольклорных образов, гиперсатурации, фейковой кинематики.

Правила для иллюстраций:
- **никакого видимого текста**, логотипов, водяных знаков внутри картинки;
- сдержанные цвета, естественный свет;
- ракурс «свидетеля», а не «постановки».

---

## 13. Когда что-то идёт не так

| Симптом | Что проверить |
|---|---|
| Шаблон не виден в селекте UI | Все 5 файлов в папке шаблона (`template.tsx`, `workflow.json`, `mapping.example.json`, `content.example.json`, `README.md`) |
| Рендер падает на ассете | Путь должен быть `generated/file.png` — без `public/`, без ведущего `/` |
| Видео отображается как broken-image | Проверь что `assetRole: "video"` стоит в content и протянут в mapping; либо что путь оканчивается на `.mp4` |
| Размер вывода не тот | `workflow.json` → `composition`: `TemplateRender` = 1080×1080, `TemplateRenderPortrait` = 1080×1350 |
| Пост не уходит в статус `ready` | В `content/tracker/index.json` посмотри `readyChecklist` — обычно блокирует `storyPackReady` |
| API вернул `200 OK`, но картинки чужие | См. пункт 9 — отправлял `templateId` без `mapping`/`content`? Это silent fallback |

---

## 14. Как Claude этим всем пользуется (для понимания, что он видит)

Claude автоматически читает [CLAUDE.md](CLAUDE.md) в каждой сессии — там детальные технические инструкции (структура шаблона, размеры, поля). Этот файл (ONBOARDING.md) Claude **не** читает автоматически — он для тебя как человека.

Если хочешь, чтобы Claude в новой сессии получил полный контекст — просто скажи ему: «Прочитай ONBOARDING.md и CLAUDE.md, потом давай работать». Он за один проход проиндексирует оба.

Полезные команды Claude'у в начале сессии:
- «Что сейчас в проекте — какие посты готовы, какие шаблоны зарегистрированы?» → он почитает `tracker/index.json` и [registry.ts](apps/helloiam-remotion/src/templates/registry.ts).
- «Прогони smoke-test и подтверди что рендер живой» → запустит UI и сделает asset-role-smoke-test.
- «Сделай пост 014 из 014_PRODUCTION_FILE.md» → если файл + ассеты есть, создаст шаблон и подскажет нажать Run Render.

---

## 15. Дальше

- Подробная техническая справка по архитектуре, шаблонам и API — в [CLAUDE.md](CLAUDE.md).
- Краткая операционная справка по UI — в [README.md](README.md).
- Тех-runbook генерации поста — [apps/post-ops-ui/src/RUNBOOK_POST_GENERATION.md](apps/post-ops-ui/src/RUNBOOK_POST_GENERATION.md).

Удачи. Если что-то здесь оказалось неточным — скажи Claude «обнови ONBOARDING.md по факту: <что не так>», и он поправит.
