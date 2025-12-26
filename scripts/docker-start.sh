#!/bin/bash
# Script to start aantekeningen-app with Docker

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "🐳 Starting aantekeningen-app with Docker..."
echo "   Project: $PROJECT_DIR"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo "⚠️  Warning: .env.local not found"
  echo "   Create .env.local with required environment variables"
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker first."
  exit 1
fi

# Stop existing container if running
echo "🛑 Stopping existing container (if any)..."
docker compose down 2>/dev/null || true

# Build and start
echo "🔨 Building and starting container..."
docker compose up -d --build

echo ""
echo "✅ Container started!"
echo ""
echo "📊 Container status:"
docker compose ps

echo ""
echo "📋 View logs:"
echo "   docker compose logs -f"
echo ""
echo "🛑 Stop container:"
echo "   docker compose down"
echo ""
echo "🌐 App should be available at: http://localhost:3001"

