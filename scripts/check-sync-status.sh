#!/bin/bash
# Script to check background sync status

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "📊 Background Sync Status Check"
echo "================================"
echo ""

# Check if app is running
if ! docker ps | grep -q aantekeningen-app; then
    echo "❌ App is not running"
    exit 1
fi

# Check cron log file
CRON_LOG="/home/stephen/logs/aantekeningen-sync-cron.log"
echo "🕐 Cron Job Logs:"
if [ -f "$CRON_LOG" ]; then
    LAST_CRON_RUN=$(tail -1 "$CRON_LOG" 2>/dev/null | grep -oP '\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}' || echo "N/A")
    CRON_LINES=$(wc -l < "$CRON_LOG" 2>/dev/null || echo "0")
    echo "   Log file: $CRON_LOG"
    echo "   Total log entries: $CRON_LINES"
    if [ "$CRON_LINES" -gt 0 ]; then
        echo "   Last entry:"
        tail -3 "$CRON_LOG" | sed 's/^/      /'
    fi
else
    echo "   ⚠️  Cron log file not found yet (will be created on first run)"
    echo "   Expected location: $CRON_LOG"
fi

echo ""

# Check metadata files in datalake
echo "📁 Datalake Metadata:"
METADATA_COUNT=$(docker exec minio mc find local/educatie-lesmateriaal/notability/Priveles/ -name "*.metadata.json" 2>/dev/null | wc -l)
echo "   Total metadata files: $METADATA_COUNT"

if [ "$METADATA_COUNT" -gt 0 ]; then
    # Get newest metadata file
    NEWEST_METADATA=$(docker exec minio mc find local/educatie-lesmateriaal/notability/Priveles/ -name "*.metadata.json" 2>/dev/null | head -1)
    if [ -n "$NEWEST_METADATA" ]; then
        echo "   Sample file: $NEWEST_METADATA"
    fi
fi

echo ""

# Check recent sync activity in Docker logs
echo "📋 Recent Sync Activity (Docker logs):"
RECENT_SYNC=$(docker-compose logs --tail 100 2>/dev/null | grep -E "🔄|✅|❌|📚|Synced|sync|metadata|Datalake|students" | tail -15)
if [ -n "$RECENT_SYNC" ]; then
    echo "$RECENT_SYNC" | sed 's/^/   /'
else
    echo "   No recent sync activity found"
fi

echo ""

# Check when last sync completed
echo "⏰ Last Sync Completion:"
LAST_SYNC_COMPLETE=$(docker-compose logs 2>/dev/null | grep "🎉 Full sync completed" | tail -1)
if [ -n "$LAST_SYNC_COMPLETE" ]; then
    echo "   $LAST_SYNC_COMPLETE" | sed 's/^/   /'
else
    echo "   No completed sync found in logs"
fi

echo ""

# Check next cron run
echo "⏭️  Next Scheduled Run:"
NEXT_CRON=$(crontab -l 2>/dev/null | grep "aantekeningen-sync-cron" | head -1)
if [ -n "$NEXT_CRON" ]; then
    echo "   Cron schedule: $NEXT_CRON"
    echo "   (Runs every 12 hours at 00:00 and 12:00)"
else
    echo "   ⚠️  No cron job found"
fi

echo ""
echo "💡 Quick Actions:"
echo "   View cron logs: tail -f $CRON_LOG"
echo "   View Docker logs: cd $PROJECT_DIR && docker-compose logs -f | grep sync"
echo "   Trigger manual sync: $PROJECT_DIR/scripts/start-background-sync.sh"

