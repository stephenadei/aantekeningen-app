#!/bin/bash
# Script to update Node.js using nvm

set -e

echo "🔄 Updating Node.js..."

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Check if nvm is loaded
if ! command -v nvm &> /dev/null; then
    echo "❌ nvm not found. Installing nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

echo "📦 Current Node.js version: $(node --version 2>/dev/null || echo 'not set')"
echo "📦 Current npm version: $(npm --version 2>/dev/null || echo 'not set')"
echo ""

# Install latest LTS
echo "⬇️  Installing latest LTS Node.js..."
nvm install --lts

# Use LTS
echo "🔄 Switching to LTS..."
nvm use --lts

# Set as default
echo "🔧 Setting LTS as default..."
nvm alias default lts/*

echo ""
echo "✅ Node.js updated!"
echo "📦 Node.js version: $(node --version)"
echo "📦 npm version: $(npm --version)"
echo ""
echo "💡 Note: Close and reopen your terminal, or run:"
echo "   source ~/.bashrc"
echo "   to use the new Node.js version in new shells"


