#!/bin/bash
# Script to start background sync for aantekeningen-app

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CRON_SECRET="${CRON_SECRET:-$(cat "$PROJECT_DIR/.env.local" 2>/dev/null | grep CRON_SECRET | cut -d '=' -f2 | tr -d '"' || echo '')}"

if [ -z "$CRON_SECRET" ]; then
  echo "⚠️  CRON_SECRET not found in environment or .env.local"
  echo "   Using default 'test-secret' (not recommended for production)"
  CRON_SECRET="test-secret"
fi

echo "🔄 Starting background sync..."
echo "   Project: $PROJECT_DIR"
echo "   Endpoint: http://localhost:3001/api/cron/sync-cache"

response=$(curl -s -X GET "http://localhost:3001/api/cron/sync-cache" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -w "\n%{http_code}")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
  echo "✅ Background sync started successfully!"
  echo "$body" | jq . 2>/dev/null || echo "$body"
  echo ""
  echo "📝 Note: Sync runs in background. Check logs for progress."
else
  echo "❌ Failed to start background sync (HTTP $http_code)"
  echo "$body"
  exit 1
fi

