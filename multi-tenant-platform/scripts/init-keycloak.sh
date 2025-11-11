#!/bin/bash

set -e

echo "=========================================="
echo "Keycloak Initialization"
echo "=========================================="
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
REALM_NAME="${KEYCLOAK_REALM:-n8n-platform}"
CLIENT_ID="${KEYCLOAK_CLIENT_ID:-n8n-portal}"

echo "Keycloak URL: $KEYCLOAK_URL"
echo "Realm: $REALM_NAME"
echo "Client ID: $CLIENT_ID"
echo ""

# Wait for Keycloak to be ready
echo "⏳ Waiting for Keycloak to be ready..."
until curl -sf "$KEYCLOAK_URL/health/ready" > /dev/null; do
    echo "   Still waiting..."
    sleep 5
done
echo "✅ Keycloak is ready"
echo ""

# Get access token
echo "🔑 Getting admin access token..."
TOKEN_RESPONSE=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=$KEYCLOAK_ADMIN" \
    -d "password=$KEYCLOAK_ADMIN_PASSWORD" \
    -d "grant_type=password" \
    -d "client_id=admin-cli")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Failed to get access token"
    exit 1
fi
echo "✅ Access token obtained"
echo ""

# Create realm
echo "🏗️  Creating realm '$REALM_NAME'..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"realm\": \"$REALM_NAME\",
        \"enabled\": true,
        \"displayName\": \"n8n Multi-Tenant Platform\",
        \"registrationAllowed\": true,
        \"registrationEmailAsUsername\": false,
        \"rememberMe\": true,
        \"verifyEmail\": false,
        \"loginWithEmailAllowed\": true,
        \"duplicateEmailsAllowed\": false,
        \"resetPasswordAllowed\": true
    }" || echo "Realm may already exist"
echo "✅ Realm created or already exists"
echo ""

# Create client
echo "🔧 Creating client '$CLIENT_ID'..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"clientId\": \"$CLIENT_ID\",
        \"enabled\": true,
        \"publicClient\": true,
        \"protocol\": \"openid-connect\",
        \"directAccessGrantsEnabled\": true,
        \"standardFlowEnabled\": true,
        \"implicitFlowEnabled\": false,
        \"redirectUris\": [
            \"http://localhost/*\",
            \"http://localhost:3000/*\"
        ],
        \"webOrigins\": [
            \"http://localhost\",
            \"http://localhost:3000\"
        ],
        \"attributes\": {
            \"pkce.code.challenge.method\": \"S256\"
        }
    }" || echo "Client may already exist"
echo "✅ Client created or already exists"
echo ""

echo "=========================================="
echo "Keycloak Configuration Complete!"
echo "=========================================="
echo ""
echo "Access Keycloak Admin Console:"
echo "  URL: $KEYCLOAK_URL"
echo "  Username: $KEYCLOAK_ADMIN"
echo "  Password: $KEYCLOAK_ADMIN_PASSWORD"
echo ""
echo "Realm: $REALM_NAME"
echo "Client: $CLIENT_ID"
echo ""
echo "You can now access the portal at: http://localhost"
echo ""
