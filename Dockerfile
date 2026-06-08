FROM node:22-bookworm-slim

# Headless Chromium (Remotion render/still).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 \
    libxrandr2 libxkbcommon-dev libxfixes3 libxcomposite1 libxdamage1 \
    libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 \
    fonts-liberation ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (cache-friendly layer).
COPY package.json ./
COPY apps/post-ops-ui/package*.json apps/post-ops-ui/
COPY apps/helloiam-remotion/package*.json apps/helloiam-remotion/
RUN npm ci --prefix apps/post-ops-ui --omit=dev \
 && npm ci --prefix apps/helloiam-remotion

# App source.
COPY . .

# Pre-download Chromium for Remotion CLI renders.
RUN cd apps/helloiam-remotion && npx remotion browser ensure

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV PORT=4242
ENV NODE_ENV=production
EXPOSE 4242

ENTRYPOINT ["docker-entrypoint.sh"]
