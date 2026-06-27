#!/usr/bin/env bash
set -euo pipefail

VM_HOST="root@202.10.40.78"
REMOTE_DIR="/opt/omnichat"

ssh "$VM_HOST" "
  set -e
  cd $REMOTE_DIR

  echo '=== PULL LATEST CODE ==='
  git stash
  git pull origin main

  echo '=== REBUILD & RESTART ==='
  docker compose -f docker-compose.prod.yml --env-file .env up -d --force-recreate --build api frontend

  echo '=== WAIT FOR HEALTH ==='
  sleep 10
  docker compose -f docker-compose.prod.yml restart nginx

  echo '=== CHECK STATUS ==='
  docker ps --format '{{.Names}} {{.Status}}' | grep omnichat

  echo ''
  echo '=== HEALTH CHECK ==='
  curl -sk https://localhost/api/healthz
"
