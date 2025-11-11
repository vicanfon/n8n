# Keycloak Setup Guide for n8n Integration

This guide will help you set up Keycloak and integrate it with n8n using the dash-button component.

## Prerequisites

- Docker and Docker Compose installed
- n8n repository cloned
- Node.js and pnpm installed

## Step 1: Start Keycloak

```bash
# From the n8n repository root
docker-compose -f docker-compose.keycloak.yml up -d

# Wait for Keycloak to start (this may take 1-2 minutes)
docker logs -f n8n-keycloak
```

**Wait for this message:**
```
Keycloak ... started in ...ms. Listening on: http://0.0.0.0:8080
```

## Step 2: Access Keycloak Admin Console

1. Open your browser and navigate to: http://localhost:8080
2. Click on "Administration Console"
3. Login with:
   - **Username:** admin
   - **Password:** admin

## Step 3: Create a Realm

1. In the Keycloak admin console, hover over "master" in the top-left corner
2. Click "Create Realm"
3. Enter realm name: **n8n-realm**
4. Click "Create"

## Step 4: Create a Client

1. In the n8n-realm, click "Clients" in the left sidebar
2. Click "Create client"
3. Configure as follows:
   - **Client type:** OpenID Connect
   - **Client ID:** n8n-client
   - Click "Next"
4. **Capability config:**
   - Client authentication: **OFF** (important for dash-button)
   - Authorization: **OFF**
   - Authentication flow:
     - ✅ Standard flow
     - ✅ Direct access grants
     - ✅ Implicit flow
   - Click "Next"
5. **Login settings:**
   - Root URL: http://localhost:5678
   - Home URL: http://localhost:5678
   - Valid redirect URIs:
     - http://localhost:5678/*
     - http://localhost:5678/rest/sso/oidc/callback
   - Valid post logout redirect URIs:
     - http://localhost:5678/*
   - Web origins: http://localhost:5678
   - Click "Save"

## Step 5: Configure Client Settings

1. Click on the "n8n-client" client you just created
2. Go to "Settings" tab
3. Scroll down to "Advanced" section
4. Set **Access Token Lifespan:** 15 minutes (or as needed)
5. Click "Save"

## Step 6: Create Realm Roles

1. Click "Realm roles" in the left sidebar
2. Click "Create role"
3. Create the following roles:
   - **Role name:** n8n-user
   - **Description:** Standard n8n user
   - Click "Save"
4. Repeat to create:
   - **n8n-admin** - Administrator role
   - **n8n-editor** - Editor role

## Step 7: Create Users

### Admin User
1. Click "Users" in the left sidebar
2. Click "Create new user"
3. Configure:
   - **Username:** admin@n8n.io
   - **Email:** admin@n8n.io
   - **Email verified:** ON
   - **First name:** Admin
   - **Last name:** User
4. Click "Create"
5. Go to "Credentials" tab
   - Click "Set password"
   - **Password:** admin123
   - **Temporary:** OFF
   - Click "Save"
6. Go to "Role mapping" tab
   - Click "Assign role"
   - Select "n8n-admin" and "n8n-user"
   - Click "Assign"

### Test User
1. Click "Users" in the left sidebar
2. Click "Create new user"
3. Configure:
   - **Username:** test@n8n.io
   - **Email:** test@n8n.io
   - **Email verified:** ON
   - **First name:** Test
   - **Last name:** User
4. Click "Create"
5. Go to "Credentials" tab
   - Click "Set password"
   - **Password:** test123
   - **Temporary:** OFF
   - Click "Save"
6. Go to "Role mapping" tab
   - Click "Assign role"
   - Select "n8n-user"
   - Click "Assign"

## Step 8: Get OpenID Configuration

Your Keycloak OpenID Connect discovery URL is:
```
http://localhost:8080/realms/n8n-realm/.well-known/openid-configuration
```

You can verify it's working by visiting this URL in your browser.

## Step 9: Configure n8n Environment Variables

Create or update your n8n `.env` file with:

```bash
# Keycloak OIDC Configuration
N8N_SSO_OIDC_LOGIN_ENABLED=true
N8N_SSO_OIDC_CLIENT_ID=n8n-client
N8N_SSO_OIDC_CLIENT_SECRET=
N8N_SSO_OIDC_ISSUER=http://localhost:8080/realms/n8n-realm
N8N_SSO_OIDC_AUTHORIZATION_URL=http://localhost:8080/realms/n8n-realm/protocol/openid-connect/auth
N8N_SSO_OIDC_TOKEN_URL=http://localhost:8080/realms/n8n-realm/protocol/openid-connect/token
N8N_SSO_OIDC_USERINFO_URL=http://localhost:8080/realms/n8n-realm/protocol/openid-connect/userinfo

# Just-in-time user provisioning
N8N_SSO_JUST_IN_TIME_PROVISIONING=true

# Redirect URL
N8N_SSO_REDIRECT_URL=http://localhost:5678/rest/sso/oidc/callback
```

## Step 10: Keycloak URLs for dash-button

For the dash-button component, you'll need:

- **Keycloak URI:** http://localhost:8080
- **Realm:** n8n-realm
- **Client ID:** n8n-client

## Troubleshooting

### Keycloak won't start
```bash
# Check logs
docker logs n8n-keycloak

# Restart services
docker-compose -f docker-compose.keycloak.yml restart
```

### Reset Keycloak
```bash
# Stop and remove containers and volumes
docker-compose -f docker-compose.keycloak.yml down -v

# Start fresh
docker-compose -f docker-compose.keycloak.yml up -d
```

### Check if Keycloak is ready
```bash
curl http://localhost:8080/health/ready
```

## Next Steps

After completing this setup:
1. The dash-button component will be integrated into n8n
2. Users will be redirected to Keycloak for authentication
3. Upon successful authentication, users will be redirected back to n8n

## Test Credentials

Use these credentials to test the authentication:

- **Admin User:**
  - Email: admin@n8n.io
  - Password: admin123

- **Test User:**
  - Email: test@n8n.io
  - Password: test123
