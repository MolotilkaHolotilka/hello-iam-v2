# Параллельная работа: Cursor + Codex

**Проект:** `/Users/ilya/Downloads/hello-iam-v2`  
**План:** [CANVAS_MVP_PLAN.md](CANVAS_MVP_PLAN.md) (путь **A**)  
**Статус:** [WORK_STATUS.md](WORK_STATUS.md)

---

## Принцип распределения

| IDE | Сила | Зона |
|-----|------|------|
| **Codex** | Основной исполнитель | **Весь продукт:** UI, редактор, сохранение, рендер-flow, Import |
| **Cursor** | Вспомогательный | **Инфраструктура:** CSS parser, LLM import API, миграция, ревью merge |

Codex владеет тем, что **видит пользователь** и чем **пользуется команда каждый день**.  
Cursor — тяжёлый backend без UI (шаги 5–7) и помощь с merge/деплоем.

---

## Codex — главные задачи

| Приоритет | Шаг | Что сделать | Ветка |
|-----------|-----|-------------|-------|
| **P0** | **3** | **Props-редактор на главной** — Card 1–7, текст/цвет/картинка (upload), HTML-превью, Run Render | `codex/step-3-studio` |
| **P0** | **4** | **GET/PATCH content API** + подключение сохранения в Studio (full-stack) | `codex/step-4-content-api` |
| **P1** | **1** | Страница `import.html`, nav, file JSON off main | `codex/step-1-import` |
| **P2** | **6b** | UI «Import CSS» на Import (после Cursor step 6a) | `codex/step-6-import-ui` |

**Шаг 2** — пропущен (путь A).

### Codex владеет файлами

```
apps/post-ops-ui/src/web/**          (весь frontend)
apps/post-ops-ui/src/server.js       (routes: content GET/PATCH, import page)
apps/post-ops-ui/src/services/content-template-service.js
apps/post-ops-ui/src/web/styles.css
```

---

## Cursor — вспомогательные задачи

| Приоритет | Шаг | Что сделать | Ветка |
|-----------|-----|-------------|-------|
| **P1** | **5** | postcss CSS parser → `css-parse-service.js` | `cursor/step-5-css-parser` |
| **P1** | **6a** | LLM componentizer + `POST /api/templates/import-css` | `cursor/step-6-import-api` |
| **P2** | **7** | allowlist, docs, smoke-тесты миграции | `cursor/step-7-migrate` |
| — | review | Ревью PR Codex, merge, VPS deploy по запросу | — |

### Cursor владеет файлами

```
apps/post-ops-ui/src/services/css-parse-service.js
apps/post-ops-ui/src/services/css-componentizer-service.js
apps/post-ops-ui/package.json          (deps: postcss, только шаг 5)
apps/post-ops-ui/src/lib/template-allowlist.js   (шаг 7)
docs/**                                (кроме правок Codex в WORK_STATUS)
```

**Cursor НЕ трогает** `web/*` и `server.js` пока Codex не попросит ревью конкретного route.

---

## Порядок работ

```
Параллельно (старт):
  Codex:  шаг 3 (главная, mock save в sessionStorage)
  Cursor: шаг 5 (CSS parser) — не блокирует Codex

После шага 3:
  Codex:  шаг 4 (API + wire save) → шаг 1 (import page)

Позже:
  Cursor: шаг 6a (LLM API)
  Codex:  шаг 6b (Import CSS UI)
  Cursor: шаг 7
```

**Рекомендуемый старт Codex:** сразу **шаг 3** (самое важное), шаг 1 можно вторым.

---

## API-контракт (Codex реализует в шаге 4)

**GET** `/api/templates/:templateId/content`

```json
{
  "templateId": "i-am-lavash-deep-dive",
  "content": { "item": "...", "cards": [] },
  "mappingExample": {},
  "workflow": {}
}
```

**PATCH** `/api/templates/:templateId/content`  
Body: `{ "content": { ... } }` → пишет `content.example.json` в папку шаблона.

**Render** без изменений: `POST /api/render` + content + mapping.

---

## Git

```bash
cd /Users/ilya/Downloads/hello-iam-v2
git checkout main && git pull
# claim в WORK_STATUS.md
git checkout -b codex/step-3-studio   # Codex
git checkout -b cursor/step-5-css-parser  # Cursor
```

Один dev server: `lsof -ti :4242 | xargs kill -9; cd apps/post-ops-ui && npm start`

---

## Промпт для Codex

```
Проект: /Users/ilya/Downloads/hello-iam-v2
Читай: docs/PARALLEL_IDE.md, docs/CANVAS_MVP_PLAN.md

Ты — основной разработчик (Codex). Приоритет P0:
  Шаг 3: Props-редактор на главной (Card 1–7, текст, цвет, upload картинок, превью, Run Render)
  Шаг 4: GET/PATCH /api/templates/:id/content + сохранение на диск

Владеешь: apps/post-ops-ui/src/web/**, server.js (content routes), content-template-service.js
Не трогай: css-parse-service.js, css-componentizer-service.js (зона Cursor)

Ветка: codex/step-3-studio
Claim в docs/WORK_STATUS.md
Путь A: шаблон переиспользуется через content.json + Remotion props.
```

---

## Промпт для Cursor (этот чат)

```
Зона Cursor: шаги 5, 6a, 7 — CSS parser, LLM import API, миграция.
Не трогать web/* пока Codex делает шаг 3–4.
Ревью PR Codex, merge, deploy по запросу.
```

---

## VPS

Деплой только с `main`, один раз, по запросу.

---

## Мультиагенты и параллельный старт (Cursor + Codex)

### Можно ли вставить промпт Codex и сразу запустить Cursor?

**Да**, если зоны не пересекаются:

| Codex (сейчас) | Cursor (сейчас) | Конфликт? |
|----------------|-----------------|-----------|
| Шаг 3 — `web/**` | Шаг 5 — `css-parse-service.js` | **Нет** |
| Шаг 4 — `server.js` content routes | Шаг 5 — только `services/css-*` | **Нет** |
| Шаг 3 + 4 | Шаг 4 content API | **Да** — оба в server.js |

**Безопасный параллельный старт:**

```
Codex  →  шаг 3 (props editor, web only, mock save)
Cursor →  шаг 5 (CSS parser, services only)
```

После merge шага 3 Codex берёт шаг 4 (API + wire). Cursor не трогает `web/` и `server.js` до этого.

### Мультиагенты внутри одной IDE — опасно?

| Режим | Риск | Рекомендация |
|-------|------|--------------|
| **1 агент = 1 ветка = 1 шаг** | Низкий | **Лучший вариант** |
| 2 агента Codex: UI + API одновременно | Высокий | Оба полезут в `index.html`, `server.js` |
| 2 агента Cursor на шаг 5 и 6a | Средний | OK если 6a ждёт merge 5 |
| Cursor multitask + Codex параллельно | Низкий | Если Cursor только `css-*`, Codex только `web/*` |

**Правила:**

1. **Один «ведущий» агент на IDE** — остальные только с узкой задачей и списком файлов.
2. **Не два агента на одном файле** (`index.html`, `server.js`, `mvp-app.js`).
3. **Одна ветка на IDE** — не `codex/agent-1` и `codex/agent-2` в разные ветки без merge.
4. **Один `npm start`** на порту 4242.
5. **WORK_STATUS.md** — один claim на шаг; не два агента на один шаг.

### Когда мультиагенты OK

- Codex: один агент на шаг 3 целиком (не дробить на «HTML» + «JS» двумя агентами).
- Cursor: фоновый агент только на `css-parse-service.js` + тесты, без explore всего репо.
- Ревью: второй агент **readonly** («проверь PR codex/step-3») — безопасно.

### Когда опасно

- Codex multi-agent: один правит `index.html`, другой `mvp-app.js` + `server.js` одновременно.
- Cursor + Codex оба делают шаг 4.
- Оба пушат в `main` без rebase.
- Оба деплоят на VPS в один день.

### Практичная схема для вас

```
[Человек]
   ├─ Codex (1 сессия, 1 агент) → codex/step-3-studio → PR
   └─ Cursor (1 сессия, 1 агент) → cursor/step-5-css-parser → PR

После merge 3:
   Codex → codex/step-4-content-api

Не запускать: 2 агента Codex на 3+4 параллельно.
```
