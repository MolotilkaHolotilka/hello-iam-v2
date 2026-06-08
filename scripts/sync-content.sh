#!/usr/bin/env bash
# Sync HELLOIAM content bundle into a running hello-iam-v2 deploy.
# Usage (on VPS):
#   ./scripts/sync-content.sh /docker/hello-iam-v3
#
# First run clones https://github.com/MolotilkaHolotilka/hello-iam-content

set -euo pipefail

TARGET_DIR="${1:-.}"
CONTENT_REPO="${CONTENT_REPO:-https://github.com/MolotilkaHolotilka/hello-iam-content.git}"
CACHE_DIR="${CONTENT_CACHE:-/tmp/hello-iam-content}"

mkdir -p "$CACHE_DIR"
if [ ! -d "$CACHE_DIR/.git" ]; then
  git clone "$CONTENT_REPO" "$CACHE_DIR"
else
  git -C "$CACHE_DIR" pull origin master
fi

rsync -a --delete "$CACHE_DIR/content/" "$TARGET_DIR/content/"
rsync -a "$CACHE_DIR/apps/helloiam-remotion/public/" "$TARGET_DIR/apps/helloiam-remotion/public/"

if docker compose -f "$TARGET_DIR/docker-compose.yml" ps -q app >/dev/null 2>&1; then
  docker compose -f "$TARGET_DIR/docker-compose.yml" exec -T app npm run index
else
  (cd "$TARGET_DIR" && npm run index)
fi

echo "Content synced to $TARGET_DIR"
