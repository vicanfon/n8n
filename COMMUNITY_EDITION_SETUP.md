# Dash Button Keycloak Integration - Community Edition Setup

## 🎉 Community Edition Compatible!

This integration **works with n8n Community Edition** - no enterprise license required!

## Quick Start Guide

### 1. Start Keycloak

```bash
# From the n8n repository root
docker compose -f docker-compose.keycloak.yml up -d

# Wait for Keycloak to start (1-2 minutes)
docker logs -f n8n-keycloak
```

### 2. Configure Keycloak

Follow `keycloak-setup-guide.md` to:
1. Access Keycloak admin console at http://localhost:8080
2. Login with `admin` / `admin`
3. Create `n8n-realm` realm
4. Create `n8n-client` client (public, no secret required)
5. Create test users

**Important**: Client must be configured as **public** (no client authentication)

### 3. Configure n8n

Create `.env` file in n8n root:

```bash
# Backend Configuration
N8N_KEYCLOAK_ENABLED=true
N8N_KEYCLOAK_URI=http://localhost:8080
N8N_KEYCLOAK_REALM=n8n-realm
N8N_KEYCLOAK_CLIENT_ID=n8n-client

# Frontend Configuration (for dash-button)
VITE_KEYCLOAK_URI=http://localhost:8080
VITE_KEYCLOAK_REALM=n8n-realm
VITE_KEYCLOAK_CLIENT_ID=n8n-client
```

### 4. Install Dependencies

```bash
pnpm install
```

Note: If you get xlsx-related errors, they're warnings and won't affect the Keycloak integration.

### 5. Build n8n

```bash
# Build frontend
cd packages/frontend/editor-ui
pnpm build > build.log 2>&1

# Check for errors
tail -n 20 build.log

# Build backend
cd ../../cli
pnpm build
```

### 6. Start n8n

```bash
cd packages/cli
pnpm start

# Or for development
pnpm dev
```

### 7. Test Authentication

1. Navigate to http://localhost:5678
2. You'll see the dash-button login interface
3. Click the dash-button
4. Login with Keycloak credentials (e.g., test@n8n.io / test123)
5. You'll be redirected back to n8n and logged in!

## How It Works (Community Edition)

### Architecture

```
┌─────────────┐
│   Browser   │
│             │
│ dash-button │
└──────┬──────┘
       │
       ▼
┌─────────────┐       ┌─────────────┐
│  Keycloak   │◄──────┤   n8n CE    │
│   Server    │       │             │
│             │───────►  Token      │
└─────────────┘       │ Validation  │
                      │             │
                      │ User Mgmt   │
                      └─────────────┘
```

### Authentication Flow

1. **User clicks dash-button** → Redirects to Keycloak
2. **User authenticates** → Keycloak validates credentials
3. **Keycloak returns JWT** → Dash-button receives token
4. **Token sent to n8n** → POST `/rest/keycloak-auth/login`
5. **n8n validates token** → Calls Keycloak userinfo endpoint
6. **User created/found** → n8n creates user if first login
7. **Session cookie issued** → User logged into n8n
8. **Redirect to dashboard** → User sees n8n interface

### Key Differences from Enterprise

| Feature | Community Edition | Enterprise Edition |
|---------|-------------------|-------------------|
| **License Required** | ❌ No | ✅ Yes |
| **OIDC Identity Linking** | ❌ No | ✅ Yes |
| **SSO Provisioning** | ❌ No | ✅ Yes |
| **User Creation** | ✅ Simple | ✅ Advanced |
| **Token Validation** | ✅ Direct | ✅ Full OIDC |
| **Dash-button UI** | ✅ Yes | ✅ Yes |

## Configuration Reference

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `N8N_KEYCLOAK_ENABLED` | Yes | `false` | Enable Keycloak auth |
| `N8N_KEYCLOAK_URI` | Yes | `http://localhost:8080` | Keycloak base URL |
| `N8N_KEYCLOAK_REALM` | Yes | `n8n-realm` | Keycloak realm name |
| `N8N_KEYCLOAK_CLIENT_ID` | Yes | `n8n-client` | Keycloak client ID |

### Frontend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_KEYCLOAK_URI` | Yes | - | Keycloak base URL (same as backend) |
| `VITE_KEYCLOAK_REALM` | Yes | - | Keycloak realm name |
| `VITE_KEYCLOAK_CLIENT_ID` | Yes | - | Keycloak client ID |

## Files Modified/Created

### New Community Edition Files
- ✅ `packages/cli/src/services/keycloak.service.ts` - Token validation service
- ✅ `packages/cli/src/controllers/keycloak-auth.controller.ts` - Auth controller

### Frontend Files
- ✅ `packages/frontend/editor-ui/src/features/core/auth/views/DashButtonSigninView.vue` - Login component
- ✅ `packages/frontend/editor-ui/src/router.ts` - Router update
- ✅ `packages/frontend/editor-ui/vite.config.mts` - Vue custom element config
- ✅ `packages/frontend/editor-ui/index.html` - Font Awesome
- ✅ `packages/frontend/editor-ui/package.json` - dash-button dependency

### Configuration Files
- ✅ `docker-compose.keycloak.yml` - Keycloak Docker setup
- ✅ `.env.keycloak.example` - Environment template
- ✅ `keycloak-setup-guide.md` - Keycloak setup instructions

## Troubleshooting

### Issue: "Keycloak authentication is not enabled"

**Solution:**
Ensure `N8N_KEYCLOAK_ENABLED=true` in your `.env` file

### Issue: "Invalid or expired token"

**Solution:**
1. Check Keycloak is running: `curl http://localhost:8080/health/ready`
2. Verify realm and client configuration match `.env`
3. Check token hasn't expired (default 15 minutes)

### Issue: Dash button doesn't appear

**Solution:**
1. Check browser console for errors
2. Verify Font Awesome is loaded
3. Rebuild frontend: `cd packages/frontend/editor-ui && pnpm build`

### Issue: "Email is required in Keycloak token"

**Solution:**
1. In Keycloak, go to your realm → Client Scopes
2. Select "profile" scope → Mappers tab
3. Ensure "email" mapper is present and enabled

### Issue: User not created automatically

**Solution:**
Check n8n backend logs for errors. The service automatically creates users on first login if validation succeeds.

## Security Considerations

### Token Validation
- Tokens are validated against Keycloak's userinfo endpoint
- Expired tokens are automatically rejected
- Invalid tokens throw errors

### User Management
- Users are created with secure random passwords
- Email validation is enforced
- Users cannot login with n8n password auth (Keycloak only)

### Production Recommendations
1. **Use HTTPS** - Configure SSL/TLS for both Keycloak and n8n
2. **Secure Keycloak** - Follow Keycloak security best practices
3. **Token Expiration** - Configure appropriate token lifespans in Keycloak
4. **Database** - Use PostgreSQL or MySQL for production (not SQLite)
5. **Reverse Proxy** - Consider using Nginx/Traefik with rate limiting

## Reverting to Original Login

To go back to the default n8n login:

1. Edit `packages/frontend/editor-ui/src/router.ts`:
   ```typescript
   // Uncomment line 67:
   const SigninView = async () => await import('@/features/core/auth/views/SigninView.vue');

   // Comment out lines 68-69:
   // const SigninView = async () =>
   //   await import('@/features/core/auth/views/DashButtonSigninView.vue');
   ```

2. Rebuild frontend:
   ```bash
   cd packages/frontend/editor-ui
   pnpm build
   ```

3. Restart n8n

## Comparison with Enterprise Edition

If you need enterprise features like:
- OIDC identity linking (multiple auth methods per user)
- Advanced SSO provisioning
- Role mapping from Keycloak
- Full OIDC protocol support

Consider upgrading to n8n Enterprise Edition and using the native OIDC integration.

For most use cases, this Community Edition integration provides everything you need!

## Testing Checklist

- [ ] Keycloak starts successfully
- [ ] n8n frontend builds without errors
- [ ] n8n backend builds without errors
- [ ] Dash button appears on login page
- [ ] Clicking dash button redirects to Keycloak
- [ ] Keycloak login works
- [ ] User is redirected back to n8n
- [ ] User is logged into n8n
- [ ] Session persists after page refresh
- [ ] Logout works correctly
- [ ] Second login with same user works
- [ ] New user creation works

## Support

- **dash-button**: https://github.com/vicanfon/dash-button
- **Keycloak**: https://www.keycloak.org/documentation
- **n8n Community**: https://community.n8n.io/

---

**Version**: 1.0 (Community Edition)
**Created**: 2025-11-11
**License**: Follows n8n licensing
