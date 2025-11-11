# Multi-Tenant n8n Platform with Keycloak Authentication

This is a multi-tenant platform that wraps n8n instances with Keycloak authentication. Each authenticated user gets their own isolated n8n instance with a dedicated PostgreSQL database.

## Architecture Overview

```mermaid
graph TB
    User[User Browser] -->|HTTPS| NGINX[NGINX Reverse Proxy]
    NGINX -->|/portal| Portal[Portal Frontend<br/>React + Keycloak Client]
    NGINX -->|/api| Backend[Portal Backend<br/>Node.js + Express]
    NGINX -->|*.n8n.localhost| N8N[User n8n Instances]

    Backend -->|Authenticate| Keycloak[Keycloak<br/>Identity Provider]
    Backend -->|Provision| Provisioner[Provisioning Service]

    Provisioner -->|Create Container| Docker[Docker Engine]
    Provisioner -->|Create Database| PostgresMain[PostgreSQL Server]

    Docker -->|Run| N8N1[n8n Instance 1<br/>user-123]
    Docker -->|Run| N8N2[n8n Instance 2<br/>user-456]

    N8N1 -->|Connect| DB1[(PostgreSQL DB<br/>n8n_user_123)]
    N8N2 -->|Connect| DB2[(PostgreSQL DB<br/>n8n_user_456)]

    PostgresMain -->|Contains| DB1
    PostgresMain -->|Contains| DB2
```

## Components

### 1. User Portal
- **Frontend**: React application with Keycloak integration
- **Backend**: Express.js API server
- **Purpose**: User authentication, instance management, and launch interface

### 2. Keycloak
- **Purpose**: Identity and access management (IAM)
- **Features**: OAuth2/OIDC authentication, user management, SSO

### 3. Provisioning Service
- **Purpose**: Dynamically provision n8n instances
- **Functions**:
  - Create PostgreSQL databases
  - Spin up Docker containers
  - Configure instance settings
  - Manage instance lifecycle

### 4. NGINX Reverse Proxy
- **Purpose**: Route traffic to appropriate services
- **Routes**:
  - `/portal/*` → Portal frontend
  - `/api/*` → Portal backend
  - `user-{id}.n8n.localhost` → User's n8n instance

### 5. PostgreSQL Server
- **Purpose**: Host separate databases for each n8n instance
- **Isolation**: One database per user

## Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant Portal
    participant Keycloak
    participant Backend
    participant Provisioner
    participant Docker
    participant PostgreSQL
    participant n8n

    User->>Portal: Access Portal
    Portal->>Keycloak: Redirect to Login
    User->>Keycloak: Enter Credentials
    Keycloak->>Portal: Return JWT Token
    Portal->>Backend: Check if instance exists (with token)

    alt Instance doesn't exist
        Backend->>Provisioner: Request new instance
        Provisioner->>PostgreSQL: Create database n8n_user_{id}
        PostgreSQL-->>Provisioner: Database created
        Provisioner->>Docker: Start n8n container
        Docker-->>Provisioner: Container running
        Provisioner-->>Backend: Instance ready
    end

    Backend-->>Portal: Instance URL
    Portal->>User: Show "Launch n8n" button
    User->>NGINX: Click launch (user-{id}.n8n.localhost)
    NGINX->>n8n: Proxy request
    n8n-->>User: n8n UI
```

## Directory Structure

```
multi-tenant-platform/
├── README.md                    # This file
├── ARCHITECTURE.md              # Detailed architecture documentation
├── docker-compose.yml           # Main orchestration file
├── .env.example                 # Environment variables template
├── portal/                      # User portal application
│   ├── backend/                 # Express.js backend
│   │   ├── src/
│   │   │   ├── index.js        # Entry point
│   │   │   ├── config.js       # Configuration
│   │   │   ├── routes/         # API routes
│   │   │   ├── middleware/     # Auth middleware
│   │   │   └── services/       # Business logic
│   │   ├── package.json
│   │   └── Dockerfile
│   └── frontend/                # React frontend
│       ├── src/
│       │   ├── App.jsx
│       │   ├── keycloak.js     # Keycloak configuration
│       │   ├── components/
│       │   └── pages/
│       ├── package.json
│       ├── vite.config.js
│       └── Dockerfile
├── provisioner/                 # n8n provisioning service
│   ├── src/
│   │   ├── index.js            # Entry point
│   │   ├── docker-manager.js   # Docker container management
│   │   ├── db-manager.js       # Database provisioning
│   │   └── instance-tracker.js # Track instance state
│   ├── package.json
│   └── Dockerfile
├── nginx/                       # Reverse proxy configuration
│   ├── nginx.conf
│   └── Dockerfile
└── scripts/                     # Utility scripts
    ├── setup.sh                 # Initial setup
    ├── cleanup.sh               # Clean up instances
    └── init-keycloak.sh         # Configure Keycloak realm
```

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- At least 4GB RAM available
- Ports available: 80, 8080, 5432, 8081

## Quick Start

### 1. Clone and Setup

```bash
cd multi-tenant-platform
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start Services

```bash
docker-compose up -d
```

This will start:
- Keycloak (http://localhost:8080)
- PostgreSQL
- Portal Backend (http://localhost:3001)
- Portal Frontend (http://localhost:3000)
- Provisioning Service
- NGINX (http://localhost)

### 3. Configure Keycloak

```bash
./scripts/init-keycloak.sh
```

This script will:
- Create a realm named `n8n-platform`
- Create a client for the portal
- Set up redirect URIs

### 4. Access the Platform

1. Open http://localhost
2. Click "Login with Keycloak"
3. Create an account or login
4. Click "Launch My n8n Instance"
5. Your personal n8n instance will be provisioned at `http://user-{your-id}.n8n.localhost`

## Configuration

### Environment Variables

Key environment variables in `.env`:

```env
# Keycloak
KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_REALM=n8n-platform
KEYCLOAK_CLIENT_ID=n8n-portal
KEYCLOAK_CLIENT_SECRET=<generated-secret>

# PostgreSQL
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<secure-password>

# Portal
PORTAL_BACKEND_PORT=3001
PORTAL_FRONTEND_PORT=3000

# n8n Configuration
N8N_BASE_DOMAIN=n8n.localhost
N8N_IMAGE=n8nio/n8n:latest
```

## Development

### Running Locally

```bash
# Start infrastructure only (Keycloak, PostgreSQL)
docker-compose up -d keycloak postgres

# Run portal backend
cd portal/backend
npm install
npm run dev

# Run portal frontend (in another terminal)
cd portal/frontend
npm install
npm run dev

# Run provisioner (in another terminal)
cd provisioner
npm install
npm run dev
```

## Security Considerations

1. **Database Isolation**: Each user has a completely separate PostgreSQL database
2. **Network Isolation**: n8n instances run in isolated Docker containers
3. **Authentication**: All access is protected by Keycloak OAuth2/OIDC
4. **JWT Validation**: Backend validates all tokens with Keycloak
5. **Resource Limits**: Each n8n container has memory and CPU limits

## Scaling Considerations

For production deployment, consider:

1. **Move to Kubernetes**: Better orchestration for many instances
2. **Add Resource Quotas**: Limit CPU/memory per user
3. **Implement Auto-Shutdown**: Stop idle instances to save resources
4. **Add Load Balancer**: Distribute traffic across multiple hosts
5. **External PostgreSQL**: Use managed database service
6. **Persistent Storage**: Use volume drivers for data persistence
7. **Monitoring**: Add Prometheus/Grafana for observability

## Troubleshooting

### Check Service Status

```bash
docker-compose ps
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f portal-backend
docker-compose logs -f provisioner
```

### Check User Instances

```bash
docker ps --filter "label=n8n-instance=true"
```

### Access PostgreSQL

```bash
docker-compose exec postgres psql -U postgres
\l  # List databases
```

## Cleanup

### Stop All Services

```bash
docker-compose down
```

### Remove All Data

```bash
docker-compose down -v  # Removes volumes too
./scripts/cleanup.sh     # Removes user instances
```

## License

This multi-tenant platform wrapper is provided as-is. n8n itself is licensed under the Sustainable Use License.

## Support

For issues with:
- **This platform**: Check the logs and troubleshooting section
- **n8n itself**: See https://docs.n8n.io
- **Keycloak**: See https://www.keycloak.org/documentation
