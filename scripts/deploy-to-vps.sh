#!/usr/bin/env bash
# Deploy hello-iam-v2 to Hostinger VPS (run from your Mac, not Cursor cloud).
set -euo pipefail

LOCAL_DIR="${LOCAL_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
REMOTE="${REMOTE:-root@187.124.164.63}"
REMOTE_DIR="${REMOTE_DIR:-/docker/hello-iam-v3}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.hostinger.yaml}"

if [[ -z "${SSHPASS:-}" ]]; then
  echo "Set SSHPASS to the root password, e.g.: export SSHPASS='...'" >&2
  exit 1
fi

if ! command -v sshpass >/dev/null; then
  echo "Install sshpass: brew install hudochenkov/sshpass/sshpass" >&2
  exit 1
fi

SSH=(sshpass -e ssh -o StrictHostKeyChecking=no)
RSYNC=(rsync -avz --progress -e "sshpass -e ssh -o StrictHostKeyChecking=no")

RSYNC_EXCLUDES=(
  --exclude node_modules
  --exclude .git
  --exclude 'content/artifacts/renders'
  --exclude 'apps/helloiam-remotion/out'
  --exclude '.env'
)

echo "==> Remote prep: ${REMOTE}:${REMOTE_DIR}"
"${SSH[@]}" "$REMOTE" "mkdir -p ${REMOTE_DIR}/content ${REMOTE_DIR}/apps/helloiam-remotion/public/generated"

echo "==> Rsync code"
"${RSYNC[@]}" "${RSYNC_EXCLUDES[@]}" "${LOCAL_DIR}/" "${REMOTE}:${REMOTE_DIR}/"

echo "==> Ensure .env on server"
"${SSH[@]}" "$REMOTE" "cd ${REMOTE_DIR} && test -f .env || cp .env.example .env"
# Symlink for scripts that expect docker-compose.yml
"${SSH[@]}" "$REMOTE" "cd ${REMOTE_DIR} && ln -sf docker-compose.yaml docker-compose.yml 2>/dev/null || true"

echo "==> Docker build & up (${COMPOSE_FILE})"
"${SSH[@]}" "$REMOTE" "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} --env-file .env up -d --build"

echo "==> Local health on VPS"
"${SSH[@]}" "$REMOTE" "curl -sf http://127.0.0.1:4242/api/health && echo"

echo "==> Container status"
"${SSH[@]}" "$REMOTE" "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} ps"

echo ""
echo "Done. Traefik URL (if .env matches hostinger): https://hello-iam-v3.srv1681126.hstgr.cloud"
echo "Direct (if firewall allows 4242): http://187.124.164.63:4242"
echo "Restart: ssh ${REMOTE} 'cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} restart app'"
