# DEPLOY — Hostinger VPS + Docker

HELLOIAM Content OS: Node UI (`post-ops-ui`) + Remotion render (`helloiam-remotion`) в одном контейнере.

> В приложении **нет авторизации**. Перед выкладкой в интернет поставь **HTTPS + Basic Auth** (nginx/Caddy) или VPN.
> Внешние API-ключи (FAL/OpenAI) для основного workflow **не нужны**.

---

## Что нужно на Hostinger

- **VPS (KVM)** — не shared hosting. План с **4 GB RAM** (Remotion + Chromium).
- Ubuntu 22.04/24.04, SSH-доступ.
- ~10 GB диска под образ + `content/` + медиа.

---

## Быстрый старт на сервере

```bash
# 1. Docker (если ещё нет)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# перелогинься по SSH

# 2. Код
git clone https://github.com/MolotilkaHolotilka/hello-iam-v2.git
cd hello-iam-v2

# 3. (Опционально) порт
cp .env.example .env

# 4. Данные — залить с локальной машины (посты + картинки)
#    На сервере папки создадутся сами, но пустые до rsync:
mkdir -p content/posts content/storyboards content/tracker \
  apps/helloiam-remotion/public/generated

# С локального Mac:
# rsync -avz content/ user@YOUR_VPS:/root/helloiam-content-os/content/
# rsync -avz apps/helloiam-remotion/public/ user@YOUR_VPS:/root/helloiam-content-os/apps/helloiam-remotion/public/

# 5. Сборка и запуск
docker compose up -d --build

# 6. Логи
docker compose logs -f app
```

Открыть: `http://IP_СЕРВЕРА:4242`

Первая сборка ~5–10 мин (Chromium внутри образа).

---

## Не открывается снаружи (Hostinger)

**Важно:** приложение слушает порт **4242**. На Hostinger снаружи он часто закрыт — используй Traefik (вариант B).

### Вариант A — открыть порт напрямую (проще всего)

В `docker-compose.yaml` должно быть **`ports`**, не `expose`:

```yaml
services:
  app:
    ports:
      - "4242:4242"
```

Уже так в репозитории. На сервере:

```bash
docker compose down
docker compose up -d --build
```

1. **Hostinger hPanel → VPS → Firewall** — открыть TCP **4242** (или закрыть 4242 снаружи и использовать Traefik ниже).
2. Открыть: `http://187.124.164.63:4242`

Проверка на сервере:

```bash
curl -s http://127.0.0.1:4242/api/health
```

### Вариант B — Traefik + домен (без открытого 4242)

Если на VPS уже крутится Traefik:

```bash
docker compose -f docker-compose.traefik.yaml up -d --build
```

В `.env`:

```env
TRAEFIK_HOST=твой-домен.com
HELLOIAM_SUBDOMAIN=helloiam
BASIC_AUTH_USER=team
BASIC_AUTH_HASH=$$apr1$$...
```

Сайт: `https://helloiam.твой-домен.com`

### Контент (посты и медиа)

Код и контент — в разных репозиториях. После деплоя:

```bash
./scripts/sync-content.sh /docker/hello-iam-v3
```

Источник: [hello-iam-content](https://github.com/MolotilkaHolotilka/hello-iam-content)

---

## Обновление

```bash
cd helloiam-content-os
git pull
docker compose up -d --build
```

Данные в `content/` и `public/` **не пропадают** — они на volume.

---

## Структура на сервере

```
helloiam-content-os/
├── docker-compose.yaml
├── Dockerfile
├── content/                          # volume — посты, трекер, рендеры
│   ├── posts/
│   ├── storyboards/
│   ├── tracker/
│   └── artifacts/
└── apps/helloiam-remotion/public/    # volume — фото слайдов, emoji
    └── generated/
```

Код — в образе. Контент и медиа — на диске рядом с `docker-compose.yaml`.

---

## HTTPS + Basic Auth (nginx)

Не свети `:4242` наружу без защиты. Пример nginx на том же VPS:

```nginx
server {
    listen 443 ssl;
    server_name ops.example.com;

    # ssl_certificate ... (certbot / Hostinger)

    client_max_body_size 50m;
    proxy_read_timeout 900s;

    location / {
        auth_basic "HELLOIAM";
        auth_basic_user_file /etc/nginx/.htpasswd;
        proxy_pass http://127.0.0.1:4242;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

`proxy_read_timeout 900s` — рендер Remotion может идти несколько минут.

Создать пароль:

```bash
sudo apt install apache2-utils -y
sudo htpasswd -c /etc/nginx/.htpasswd team
```

В `docker-compose.yaml` можно убрать `ports` и оставить только `127.0.0.1:4242:4242`, чтобы порт не торчал в интернет.

---

## Hostinger: firewall

В hPanel → VPS → **Firewall** — открыть 80/443 (nginx). Порт 4242 наружу **не открывать**, если стоишь nginx.

---

## Полезные команды

```bash
docker compose ps
docker compose logs -f app
docker compose restart app
docker compose down
docker compose exec app npm run index   # пересобрать tracker index
```

---

## Чек-лист

- [ ] VPS 4 GB RAM
- [ ] `docker compose up` без ошибок
- [ ] `content/posts/` и `public/generated/` залиты
- [ ] UI открывается
- [ ] Тест **Run Render** → файлы в `content/artifacts/renders/`
- [ ] nginx + HTTPS + Basic Auth (или VPN)
- [ ] Порт 4242 закрыт снаружи (только через nginx)

---

## Troubleshooting

| Проблема | Решение |
|---|---|
| Рендер падает / Chromium crash | В compose уже `shm_size: 2gb`. Проверь RAM ≥ 4 GB. |
| Пустой список постов | Залей `content/posts/`, выполни `docker compose exec app npm run index` |
| Нет картинок в рендере | Проверь `apps/helloiam-remotion/public/generated/` на volume |
| 502 от nginx при рендере | Увеличь `proxy_read_timeout` |
