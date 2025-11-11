#!/bin/bash

set -e

echo "=========================================="
echo "n8n Multi-Tenant Platform Setup"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
    echo "⚠️  Please edit .env file and set secure passwords before starting!"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
echo "✅ Directories created"
echo ""

# Add hosts entries reminder
echo "=========================================="
echo "IMPORTANT: Add these entries to /etc/hosts"
echo "=========================================="
echo ""
echo "127.0.0.1    n8n.localhost"
echo "127.0.0.1    user-<user-id>.n8n.localhost"
echo ""
echo "Or use dnsmasq to wildcard resolve *.n8n.localhost to 127.0.0.1"
echo ""

# Pull base images
echo "📦 Pulling Docker images..."
docker pull postgres:15-alpine
docker pull quay.io/keycloak/keycloak:23.0
docker pull n8nio/n8n:latest
docker pull nginx:alpine
docker pull node:18-alpine
echo "✅ Images pulled"
echo ""

echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Run: docker-compose up -d"
echo "3. Wait for services to start (check with: docker-compose ps)"
echo "4. Run: ./scripts/init-keycloak.sh to configure Keycloak"
echo "5. Access the portal at: http://localhost"
echo ""
