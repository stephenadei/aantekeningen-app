#!/bin/bash
# Script to view aantekeningen-app Docker logs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

MODE="${1:-prod}"

if [ "$MODE" = "dev" ]; then
  echo "📋 Viewing development container logs..."
  docker compose -f docker-compose.dev.yml logs -f
else
  echo "📋 Viewing production container logs..."
  docker compose logs -f
fi

