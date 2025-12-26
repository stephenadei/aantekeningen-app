#!/bin/bash
# Script to stop aantekeningen-app Docker container

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "🛑 Stopping aantekeningen-app Docker container..."

# Stop production container
docker compose down 2>/dev/null || true

# Stop dev container
docker compose -f docker-compose.dev.yml down 2>/dev/null || true

echo "✅ Container(s) stopped"

