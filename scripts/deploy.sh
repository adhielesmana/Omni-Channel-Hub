#!/bin/bash
# OmniChat production deploy script
# Usage: ./scripts/deploy.sh [frontend|api|all]

set -euo pipefail

SERVER="root@202.10.40.78"
SSH_KEY=".ssh/id_ed25519"
REMOTE_DIR="/opt/omnichat"

deploy_frontend() {
  echo "=== Deploying frontend ==="
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=15 "$SERVER" \
    "cd $REMOTE_DIR && docker build -f Dockerfile.frontend -t omnichat-frontend:latest --no-cache . 2>&1 | tail -5"
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=15 "$SERVER" \
    "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml --env-file .env up -d --force-recreate frontend"
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=15 "$SERVER" \
    "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml restart nginx"
  echo "=== Frontend deployed ==="
}

deploy_api() {
  echo "=== Deploying API ==="
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=15 "$SERVER" \
    "cd $REMOTE_DIR && docker build -f Dockerfile.api -t omnichat-api:latest --no-cache . 2>&1 | tail -5"
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=15 "$SERVER" \
    "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml --env-file .env up -d --force-recreate api"
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=15 "$SERVER" \
    "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml restart nginx"
  echo "=== API deployed ==="
}

deploy_all() {
  deploy_api
  deploy_frontend
  echo "=== Verifying health ==="
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=15 "$SERVER" \
    "curl -sk https://202.10.40.78/api/healthz"
  echo ""
  echo "=== Deploy complete ==="
}

TARGET="${1:-all}"
case "$TARGET" in
  frontend) deploy_frontend ;;
  api) deploy_api ;;
  all) deploy_all ;;
  *) echo "Usage: $0 [frontend|api|all]"; exit 1 ;;
esac
