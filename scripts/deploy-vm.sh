#!/usr/bin/env bash
set -euo pipefail

VM_HOST="omnichat-new"
REMOTE_DIR="/opt/omnichat"

ssh "$VM_HOST" "bash -s" <<'EOF'
set -euo pipefail

REMOTE_DIR="/opt/omnichat"

wait_for_url() {
  local url="$1"
  local label="$2"

  for _ in $(seq 1 30); do
    if curl -fsS "$url" >/dev/null; then
      echo "=== ${label} healthy ==="
      return 0
    fi
    sleep 2
  done

  echo "ERROR: ${label} did not become healthy: ${url}" >&2
  return 1
}

cd "$REMOTE_DIR"

echo '=== PULL LATEST CODE ==='
# Keep the VM's local .env on disk; compose needs it for runtime config.
git stash push --quiet || true
git pull origin main

echo '=== REBUILD & RESTART ==='
docker compose -f docker-compose.prod.yml --env-file .env up -d --force-recreate --build api frontend

echo '=== WAIT FOR HEALTH ==='
wait_for_url http://127.0.0.1:8080/api/healthz 'API'
wait_for_url http://127.0.0.1:8081 'Frontend'

echo '=== CHECK STATUS ==='
docker ps --format '{{.Names}} {{.Status}}' | grep omnichat

echo ''
echo '=== HEALTH CHECK ==='
curl -fsS http://127.0.0.1:8080/api/healthz
echo
EOF
