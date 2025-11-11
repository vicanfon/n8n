#!/bin/bash

set -e

echo "=========================================="
echo "n8n Multi-Tenant Platform Cleanup"
echo "=========================================="
echo ""

# Warning
read -p "⚠️  This will remove ALL user instances. Are you sure? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled"
    exit 0
fi

# Stop and remove user n8n containers
echo "🧹 Removing user n8n containers..."
docker ps -a --filter "label=n8n-instance=true" -q | xargs -r docker rm -f
echo "✅ User containers removed"
echo ""

# List and optionally remove user databases
echo "📊 Listing user databases..."
docker exec n8n-postgres psql -U postgres -c "SELECT datname FROM pg_database WHERE datname LIKE 'n8n_user_%';"
echo ""

read -p "❓ Do you want to remove all user databases? (yes/no): " confirm_db
if [ "$confirm_db" == "yes" ]; then
    echo "🗑️  Removing user databases..."

    # Get list of databases
    databases=$(docker exec n8n-postgres psql -U postgres -t -c "SELECT datname FROM pg_database WHERE datname LIKE 'n8n_user_%';")

    for db in $databases; do
        echo "   Dropping database: $db"
        docker exec n8n-postgres psql -U postgres -c "DROP DATABASE IF EXISTS $db;"
    done

    echo "✅ User databases removed"
    echo ""

    # Remove users
    echo "👤 Removing database users..."
    users=$(docker exec n8n-postgres psql -U postgres -t -c "SELECT usename FROM pg_user WHERE usename LIKE 'n8n_%';")

    for user in $users; do
        echo "   Dropping user: $user"
        docker exec n8n-postgres psql -U postgres -c "DROP USER IF EXISTS $user;"
    done

    echo "✅ Database users removed"
else
    echo "⏭️  Skipping database removal"
fi

echo ""
echo "=========================================="
echo "Cleanup Complete!"
echo "=========================================="
echo ""
