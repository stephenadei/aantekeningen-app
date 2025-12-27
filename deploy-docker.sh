#!/bin/bash

# Aantekeningen App Docker Deploy Script
set -e

echo "🚀 Deploying Aantekeningen App with Docker..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Not in aantekeningen-app directory. Please run from aantekeningen-app/"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    print_warning ".env.local file not found. Please create it with required environment variables"
    print_warning "You can use import.env as a reference"
fi

# Stop existing container if running
print_status "Stopping existing container..."
docker stop aantekeningen-app 2>/dev/null || true
docker rm aantekeningen-app 2>/dev/null || true

# Build and start with Docker Compose
print_status "Building and starting Docker container..."
docker-compose build --no-cache

print_status "Starting container..."
docker-compose up -d

# Wait for container to be healthy
print_status "Waiting for container to be ready..."
sleep 5

# Check container status
if docker ps | grep -q aantekeningen-app; then
    print_status "✅ Container is running!"
    docker ps | grep aantekeningen-app
else
    print_error "❌ Container failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# Setup NGINX
print_status "Setting up NGINX..."
sudo cp nginx-aantekeningen.conf /etc/nginx/sites-available/stephensprive.app

# Enable site
sudo ln -sf /etc/nginx/sites-available/stephensprive.app /etc/nginx/sites-enabled/

# Test NGINX configuration
print_status "Testing NGINX configuration..."
sudo nginx -t

# Reload NGINX
print_status "Reloading NGINX..."
sudo systemctl reload nginx

# Setup SSL with Certbot
print_status "Setting up SSL certificate..."
if command -v certbot &> /dev/null; then
    sudo certbot --nginx -d stephensprive.app --non-interactive --agree-tos --email stephen@stephensprivelessen.nl 2>/dev/null || print_warning "SSL certificate setup skipped (may already exist)"
else
    print_warning "Certbot not found. Please install certbot and run:"
    print_warning "sudo certbot --nginx -d stephensprive.app"
fi

print_status "✅ Deployment complete!"
print_status "🌐 App available at: https://stephensprive.app"
print_status "📊 Container status: docker ps | grep aantekeningen-app"
print_status "📝 Container logs: docker-compose logs -f"
print_status "🛑 Stop container: docker-compose down"

