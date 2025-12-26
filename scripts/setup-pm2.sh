#!/bin/bash
# Script to setup PM2 for persistent Next.js app

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Setting up PM2 for aantekeningen-app..."
echo "   Project: $PROJECT_DIR"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo "📦 Installing PM2..."
  npm install -g pm2
fi

cd "$PROJECT_DIR"

# Build the app first
echo "🔨 Building application..."
npm run build

# Stop existing PM2 process if running
echo "🛑 Stopping existing PM2 process..."
pm2 stop aantekeningen-app 2>/dev/null || true
pm2 delete aantekeningen-app 2>/dev/null || true

# Start with PM2
echo "▶️  Starting with PM2..."
pm2 start npm --name "aantekeningen-app" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
echo "⚙️  Setting up PM2 startup..."
pm2 startup | tail -1 | bash || echo "⚠️  Run the command above manually as root"

echo ""
echo "✅ PM2 setup complete!"
echo ""
echo "📊 Useful commands:"
echo "   pm2 status              - Check app status"
echo "   pm2 logs aantekeningen-app - View logs"
echo "   pm2 restart aantekeningen-app - Restart app"
echo "   pm2 stop aantekeningen-app - Stop app"
echo ""
echo "🌐 App should be running at: http://localhost:3001"

