#!/bin/bash
# Cleanup script for development environment
# Removes lock files and optionally kills old Next.js dev processes

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_FILE="$PROJECT_DIR/.next/dev/lock"

echo "🧹 Cleaning up development environment..."

# Remove lock file if it exists
if [ -f "$LOCK_FILE" ]; then
  echo "  Removing lock file: $LOCK_FILE"
  rm -f "$LOCK_FILE"
fi

# Check for running Next.js dev processes
NEXT_PIDS=$(pgrep -f "next dev" || true)

if [ -n "$NEXT_PIDS" ]; then
  echo "  Found running Next.js dev processes:"
  ps -p $NEXT_PIDS -o pid,cmd || true
  
  read -p "  Kill these processes? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    kill $NEXT_PIDS 2>/dev/null || true
    echo "  ✅ Killed old processes"
  else
    echo "  ⚠️  Keeping processes running"
  fi
else
  echo "  ✅ No old processes found"
fi

echo "✅ Cleanup complete!"

