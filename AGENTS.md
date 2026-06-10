# HELLOIAM.AM — Content OS

Привет! Это проект генерации контента для @helloiam.am (армянская гастро-культура). Карточки/видео собираются из Remotion-шаблонов: текст и картинки приходят как JSON и подставляются в `.tsx`-разметку, на выходе — PNG и MP4 для постинга.

## При первом запуске

**Запусти UI сразу**, без вопросов, и поприветствуй пользователя пока он стартует:

```
cd apps/post-ops-ui && npm install && npm run dev
```

UI откроется на http://localhost:3000 (порт см. в выводе). Дальше — короткий брифинг ниже.

---

## Куда что складывать

Все ассеты лежат внутри [apps/helloiam-remotion/](apps/helloiam-remotion/). Это монокорень Remotion-приложения, оттуда читает рендерер.

### Картинки и эмодзи

| Что | Куда | Имя |
|---|---|---|
| Фото-ассет (фон, главное фото) | `apps/helloiam-remotion/public/generated/` | `<short-name>.png` или `.jpg` |
| Эмодзи / иконка | `apps/helloiam-remotion/public/generated/emoji/` | `emoji-<name>.png` |

В JSON-контенте пиши путь **относительно `public/`**, например `generated/lavash.png` или `generated/emoji/emoji-lavash.png` — `staticFile()` добавит `public/` сам.

### Видео (готовые рендеры)

Сохраняются автоматически в `apps/helloiam-remotion/out/` (для CLI-рендеров) и в `content/artifacts/renders/<runId>/` (для рендеров через UI).

### Шаблоны (`.tsx`)

Один шаблон = одна папка в [apps/helloiam-remotion/src/templates/](apps/helloiam-remotion/src/templates/):

```
src/templates/<template-id>/
├── template.tsx              # Remotion-компонент (React)
├── workflow.json             # метаданные: cardCount, размер, композиция
├── mapping.example.json      # маппинг слотов шаблона → путей в content
├── content.example.json      # пример контента
└── README.md                 # 1-абзац описания
```

Шаблоны подхватываются автоматически (`registry.ts` пере-генерится при загрузке списка через UI).

**Размер шаблона:**
- 1080×1080 (квадрат) → `composition: "TemplateRender"` в workflow.json
- 1080×1350 (портрет 4:5 для Instagram) → `composition: "TemplateRenderPortrait"`

Если нужен другой размер — добавь новую `<Composition>` в [Root.tsx](apps/helloiam-remotion/src/Root.tsx) и пропиши длительность в `COMPOSITION_DURATIONS` в [remotion-render-service.js](apps/post-ops-ui/src/services/remotion-render-service.js).

---

## Как пользоваться интерфейсом

1. Открой http://localhost:3000.
2. Выбери шаблон в селекте **Template** (например, `green-plate-intro`).
3. В правом блоке появятся два редактируемых JSON-а — Mapping и Content. Можешь править прямо тут или загрузить файл.
4. Жми **Run Render**.
5. После рендера в нижнем блоке: PNG-превью каждой карточки, MP4 целиком, и **N отдельных видео** (по карточке) если в `workflow.json` стоит `splitVideos: true`.

---

## Как сделать пост из production-файла (карусель 7 карточек)

**Триггер:** пользователь кидает `XXX_PRODUCTION_FILE.md` (где XXX — postId типа `010`, `012`, `103`) + 6 фоток `XXX_1.png…XXX_6.png` + `XXX_emoji.png`.

**Что должен сделать агент из коробки** (без вопросов, если файл подпадает под формат):

### Шаг 1 — Извлечь данные из production-файла

Из `.md`-файла нужно:
- `postId` (из имени файла или из `Post ID:`)
- `Public title` → стать `TITLE` для Hello-карточки (например `FOOD`, `STREETS`, `WINE`)
- `Slide Text` блок: слайды 1–7 (слайд 7 обычно пустой, это Brand)

Slug шаблона: `i-am-{lowercase-title}-intro` (для wine — `i-am-wine-deep-dive`).

### Шаг 2 — Создать папку шаблона

`apps/helloiam-remotion/src/templates/i-am-<slug>-intro/` — 5 файлов:

**`template.tsx`** (1 строка, реэкспорт):
```ts
export {GreenPlateIntroTemplate as Template} from '../green-plate-intro/template';
```

**`workflow.json`**:
```json
{
  "id": "i-am-<slug>-intro",
  "templateId": "i-am-<slug>-intro",
  "name": "I Am <Title> Intro",
  "format": "carousel-portrait",
  "cardCount": 7,
  "width": 1080,
  "height": 1350,
  "fps": 30,
  "durationPerCardFrames": 90,
  "composition": "TemplateRenderPortrait",
  "splitVideos": true,
  "exportName": "Template"
}
```

**`mapping.example.json`** — скопируй один-в-один из [i-am-food-intro/mapping.example.json](apps/helloiam-remotion/src/templates/i-am-food-intro/mapping.example.json), поменяй только `templateId`.

**`content.example.json`** — 7 карточек:
- `cards[0]` (Hello, красный): `title: "HELLO,\nI AM"`, `titleAccent: "<TITLE>"`, `label: "AM <TITLE>"`, `image: "generated/XXX_1.png"`, `background: "#d61e23"`, `titleColor: "#ffffff"`, `accentColor: "#ffce1f"`
- `cards[1..5]` (5 Quote, серые): `title: "I AM _ <TITLE>"`, `image: "generated/XXX_2.png"…XXX_6.png`, `quote: <текст слайда 2..6>`, `label: "AM <TITLE>"`, `background: "#d9dde0"`, `quoteColor: "#d61e23"`
- `cards[6]` (Brand, серый): `brandLeft: "helloiam"`, `brandRight: "am"`, `image: "generated/XXX_emoji.png"`, `background: "#d9dde0"`, `brandColor: "#420000"`

**`README.md`** — 5 строк описания (см. примеры в существующих папках).

### Шаг 3 — Добавить в registry

В [src/templates/registry.ts](apps/helloiam-remotion/src/templates/registry.ts) добавь:
1. `import * as templateN from './i-am-<slug>-intro/template';` в импорты
2. `"i-am-<slug>-intro": pickTemplate(templateN, "i-am-<slug>-intro", "Template"),` в `templateRegistry`

`N` — следующий свободный индекс.

### Готовые примеры

Скопируй структуру из любой папки:
- [i-am-food-intro/](apps/helloiam-remotion/src/templates/i-am-food-intro/) — пост 010 (Category Map)
- [i-am-streets-intro/](apps/helloiam-remotion/src/templates/i-am-streets-intro/) — пост 012 (Category Map)
- [i-am-wine-deep-dive/](apps/helloiam-remotion/src/templates/i-am-wine-deep-dive/) — пост 103 (Deep Dive)

### Финальный шаг — ассеты

Скажи пользователю положить `XXX_1.png…XXX_6.png` + `XXX_emoji.png` в `apps/helloiam-remotion/public/generated/`. Без них рендер упадёт на валидации ассетов.

После этого: рестарт UI-сервера НЕ нужен (он перечитывает шаблоны при каждой загрузке списка), F5 в браузере — и шаблон в селекте.

---

## Спецификация шаблона `green-plate-intro` (карусель 7 карточек)

Это базовый шаблон, который реэкспортируют все 7-карточные посты (food, streets, wine). Логика лежит в [src/templates/green-plate-intro/template.tsx](apps/helloiam-remotion/src/templates/green-plate-intro/template.tsx).

### Технические параметры

- Размер: **1080×1350** (Instagram портрет 4:5)
- Длительность: **90 кадров/карточка × cardCount** (90 / 30fps = 3 секунды)
- Композиция: `TemplateRenderPortrait` (640 кадров max в [Root.tsx](apps/helloiam-remotion/src/Root.tsx))
- Шрифты (Google Fonts): **Instrument Sans** (заголовки/UI), **Instrument Serif** (цитаты)
- Поведение: первая карточка = Hello, последняя = Brand, все средние = Quote (автоматически через `pickCard(index, total)`)
- Анимации: вход 18 кадров (fade+slide), выход 14 кадров (fade), цвета и шрифты внутри карточки не анимируются

### Card 1 — Hello (красный экран)

| Элемент | Позиция | Шрифт | Стиль |
|---|---|---|---|
| `title` (например `HELLO,\nI AM`) | left:40, top:40 | Instrument Sans 700, 164px, line-height 0.951 | цвет `titleColor` (по умолчанию `#ffffff`) |
| `titleAccent` (например `STREETS`) | под title (left:40, top:~352) | Instrument Sans 700, 164px | цвет `accentColor` (по умолчанию `#ffce1f` — жёлтый) |
| `image` | left:-95, top:242, 1698×1698 | объект-фон (`object-fit: contain`) | анимация — лёгкий zoom 1.05→1.0 |
| `label` (например `AM FOOD`) | left:40, top:1285 | Instrument Sans 700, 26px, letter-spacing 1 | цвет `#000` |
| `background` | весь экран | — | по умолчанию `#d61e23` (красный) |

### Card 2..N-1 — Quote (серый экран с фото)

| Элемент | Позиция | Шрифт | Стиль |
|---|---|---|---|
| `title` (мини-заголовок `I AM _ STREETS`) | left:40, top:40 | Instrument Sans 700, 44px, line-height 1 | цвет `#0f0f10` |
| `image` (фото слайда) | left:28, top:235, 1024×645 | `object-fit: cover` | плавает ±8px, наклон ±1.2° |
| `quote` (текст цитаты) | left:40, top:928, width:830 | Instrument **Serif**, 64px, line-height 0.875 | цвет `quoteColor` (по умолчанию `#d61e23` — красный) |
| `label` (`AM FOOD`) | left:40, top:1285 | Instrument Sans 700, 26px | цвет `#000` |
| `background` | весь экран | — | по умолчанию `#d9dde0` (светло-серый) |

### Card N — Brand (последняя, серый экран с эмодзи)

| Элемент | Позиция | Шрифт | Стиль |
|---|---|---|---|
| `brandLeft` (`helloiam`) | центр, top:588 | Instrument Sans 700, 96px | цвет `brandColor` (по умолчанию `#420000` — тёмно-бордо) |
| `image` (эмодзи) | inline между brandLeft и brandRight, 180×180 | `object-fit: contain` | вращение от −22° к 0° (24 кадра) |
| `brandRight` (`am`) | inline после эмодзи | Instrument Sans 700, 96px | тот же brandColor |
| `background` | весь экран | — | по умолчанию `#d9dde0` |

### Поля карточки в `content.example.json`

| Поле | Тип | Где используется | Дефолт |
|---|---|---|---|
| `title` | string | Hello, Quote | — |
| `titleAccent` | string | Hello (только) | — |
| `quote` | string | Quote (только) | — |
| `label` | string | Hello, Quote | — |
| `image` | string путь относительно `public/` | везде | — |
| `background` | hex цвет | везде | `#d61e23` / `#d9dde0` |
| `titleColor`, `accentColor` | hex | Hello | `#ffffff`, `#ffce1f` |
| `quoteColor` | hex | Quote | `#d61e23` |
| `brandLeft`, `brandRight` | string | Brand (только) | `helloiam`, `am` |
| `brandColor` | hex | Brand | `#420000` |

`\n` в `title` / `titleAccent` — перенос строки (нужен на Hello для разделения `HELLO,` и `I AM`).

### Слоты в `mapping.example.json`

`card1` → `card7` соответствуют активному индексу. Для 7-карточной карусели полный набор:
- `card1.*` — Hello (см. поля выше)
- `card2.*` … `card6.*` — Quote
- `card7.*` — Brand (использует `brandLeft`/`brandRight`/`image`/`brandColor`)

Если уменьшаешь `cardCount` (например 6), `card7` не маппится, brand уезжает на `card6`.

---

## Создание шаблона с нуля (если нужен новый дизайн)

Если дизайн НЕ карусель 1080×1350 (Hello + Quote + Brand), а что-то новое — кидай скриншот мокапа, опиши слоты → агент сгенерит `template.tsx` через визуальное распознавание (один раз, при создании). Дальше воркфлоу делается по той же схеме.

### Маппинг (mapping.example.json) — текстом достаточно

Визуальное распознавание тут не нужно. Агент читает `template.tsx` (видит слоты `props.card1.title`, `props.card2.image`) + `content.example.json` (где лежат тексты), и собирает:

```json
{
  "slots": {
    "card1.title": "cards[0].title",
    "card2.image": "cards[1].image"
  }
}
```

---

## Архитектура (коротко)

- [apps/helloiam-remotion/](apps/helloiam-remotion/) — Remotion-приложение, в нём шаблоны и сами рендеры.
- [apps/post-ops-ui/](apps/post-ops-ui/) — Node.js + Express + ванильный JS-UI для запуска рендеров (это то, что мы запускаем через `npm run dev`).
- [content/](content/) — артефакты рендера (PNG/MP4) и материалы для постов.
- [emoji/](emoji/), [images/](images/) — исходники ассетов (НЕ те, что попадают в рендер; для рендера используется только `apps/helloiam-remotion/public/generated/`).

---

## Команды

```bash
# UI (главное окно работы)
cd apps/post-ops-ui && npm run dev

# Remotion Studio (для редактирования и превью шаблонов)
cd apps/helloiam-remotion && npm run dev

# Рендер из командной строки
cd apps/helloiam-remotion
npx remotion render src/index.ts <CompositionId> out/<file>.mp4
```

Композиции: `HelloIamPost001`, `TemplateRender`, `TemplateRenderPortrait`, `GreenPlateIntro`, `GreenPlateCard70/71/75`.

---

## Если что-то не работает

- Шаблон не появился в селекте → проверь, что в папке есть все 5 файлов (особенно `mapping.example.json`, `content.example.json`).
- Рендер падает на ассете → путь в content должен быть относительно `public/`, без ведущего `/` и без `public/`.
- Размер видео неправильный → проверь `composition` в `workflow.json`.
