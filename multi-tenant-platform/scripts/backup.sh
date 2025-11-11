#!/bin/bash

set -e

echo "=========================================="
echo "n8n Multi-Tenant Platform Backup"
echo "=========================================="
echo ""

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📦 Starting backup process..."
echo "Backup directory: $BACKUP_DIR"
echo "Timestamp: $DATE"
echo ""

# Backup PostgreSQL (all databases)
echo "💾 Backing up PostgreSQL databases..."
docker exec n8n-postgres pg_dumpall -U postgres | gzip > "$BACKUP_DIR/postgres_all_$DATE.sql.gz"
echo "✅ PostgreSQL backup complete: postgres_all_$DATE.sql.gz"
echo ""

# Backup Keycloak database separately
echo "🔑 Backing up Keycloak database..."
docker exec n8n-postgres pg_dump -U postgres keycloak | gzip > "$BACKUP_DIR/keycloak_$DATE.sql.gz"
echo "✅ Keycloak backup complete: keycloak_$DATE.sql.gz"
echo ""

# Backup user databases list
echo "📋 Creating user databases list..."
docker exec n8n-postgres psql -U postgres -t -c "SELECT datname FROM pg_database WHERE datname LIKE 'n8n_user_%';" > "$BACKUP_DIR/user_databases_$DATE.txt"
echo "✅ User databases list created: user_databases_$DATE.txt"
echo ""

# Backup instance metadata (if provisioner has an export endpoint)
echo "📊 Backing up instance metadata..."
curl -s http://localhost:3002/instances > "$BACKUP_DIR/instances_$DATE.json" 2>/dev/null || echo "⚠️  Could not fetch instance metadata"
echo ""

# Backup environment configuration (without secrets)
echo "⚙️  Backing up configuration..."
if [ -f .env ]; then
    grep -v -E '(PASSWORD|SECRET)' .env > "$BACKUP_DIR/config_$DATE.txt"
    echo "✅ Configuration backup complete: config_$DATE.txt"
else
    echo "⚠️  No .env file found"
fi
echo ""

# Clean up old backups
echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -type f \( -name "*.sql.gz" -o -name "*.txt" -o -name "*.json" \) -mtime +$RETENTION_DAYS -delete
echo "✅ Old backups removed"
echo ""

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

echo "=========================================="
echo "Backup Complete!"
echo "=========================================="
echo ""
echo "Backup location: $BACKUP_DIR"
echo "Total backup size: $BACKUP_SIZE"
echo "Retention period: $RETENTION_DAYS days"
echo ""
echo "Backup files created:"
ls -lh "$BACKUP_DIR"/*_$DATE.* 2>/dev/null || echo "No backup files found"
echo ""
