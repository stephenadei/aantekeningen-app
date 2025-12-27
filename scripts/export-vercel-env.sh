#!/bin/bash

# Export Vercel Environment Variables to .env.local
# This script uses Vercel CLI to pull environment variables

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_section() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

print_section "Vercel Environment Variables Exporter"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI not found. Installing..."
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Install Vercel CLI globally
    print_status "Installing Vercel CLI globally..."
    sudo npm install -g vercel
    
    if ! command -v vercel &> /dev/null; then
        print_error "Failed to install Vercel CLI. Please install manually:"
        print_error "  sudo npm install -g vercel"
        exit 1
    fi
    
    print_status "✅ Vercel CLI installed successfully"
fi

# Check Vercel version
VERCEL_VERSION=$(vercel --version 2>/dev/null || echo "unknown")
print_status "Vercel CLI version: $VERCEL_VERSION"

# Check if already logged in
print_status "Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    print_warning "Not logged in to Vercel. Please login..."
    vercel login
else
    USER=$(vercel whoami)
    print_status "Logged in as: $USER"
fi

# Check if project is linked
print_status "Checking if project is linked to Vercel..."
if [ ! -f ".vercel/project.json" ]; then
    print_warning "Project not linked to Vercel. Linking now..."
    print_status "Select your project when prompted..."
    vercel link
else
    print_status "✅ Project is already linked"
    cat .vercel/project.json
fi

# Backup existing .env.local if it exists
if [ -f ".env.local" ]; then
    BACKUP_FILE=".env.local.backup.$(date +%Y%m%d_%H%M%S)"
    print_warning "Backing up existing .env.local to $BACKUP_FILE"
    cp .env.local "$BACKUP_FILE"
    print_status "✅ Backup created: $BACKUP_FILE"
fi

# Pull environment variables
print_section "Pulling Environment Variables from Vercel"

print_status "Pulling environment variables..."
print_warning "This will overwrite your current .env.local file!"

# Pull environment variables for production
vercel env pull .env.local --environment=production --yes

if [ $? -eq 0 ]; then
    print_status "✅ Environment variables pulled successfully!"
    
    # Show what was pulled
    print_section "Pulled Environment Variables"
    print_status "Variables in .env.local:"
    grep -v "^#" .env.local | grep "=" | cut -d'=' -f1 | sort
    
    # Important notes
    print_section "Next Steps"
    print_warning "⚠️  IMPORTANT: Update these URLs in .env.local:"
    echo "   - NEXTAUTH_URL=https://stephensprive.app"
    echo "   - GOOGLE_REDIRECT_URI=https://stephensprive.app"
    echo ""
    print_status "Edit .env.local now:"
    echo "   nano .env.local"
    echo ""
    print_status "Then deploy with:"
    echo "   ./deploy-docker.sh"
    
else
    print_error "Failed to pull environment variables"
    exit 1
fi

