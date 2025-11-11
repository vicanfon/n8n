# Quick Start Guide

Get your n8n multi-tenant platform running in 5 minutes!

## Prerequisites

- Docker and Docker Compose installed
- 4GB+ RAM available
- Ports 80 and 8080 free

## Setup Steps

### 1. Initial Setup

```bash
cd multi-tenant-platform

# Make scripts executable
chmod +x scripts/*.sh

# Run setup
./scripts/setup.sh

# Copy environment file
cp .env.example .env
```

### 2. Configure /etc/hosts

Add this line to `/etc/hosts`:

```bash
sudo nano /etc/hosts
```

Add:
```
127.0.0.1    n8n.localhost
```

For wildcard subdomains (recommended):
```bash
# Install dnsmasq
sudo apt-get install dnsmasq

# Configure wildcard
echo "address=/.n8n.localhost/127.0.0.1" | sudo tee /etc/dnsmasq.d/n8n.conf

# Restart
sudo systemctl restart dnsmasq
```

### 3. Start Services

```bash
# Start all services
docker compose up -d

# Check status (wait until all are "running")
docker compose ps

# Watch logs
docker compose logs -f
```

Wait for all services to be healthy (about 30-60 seconds).

### 4. Initialize Keycloak

```bash
# Run initialization script
./scripts/init-keycloak.sh
```

### 5. Access the Portal

Open your browser and go to: **http://localhost**

1. Click "Sign In with Keycloak"
2. Click "Register" to create an account
3. Fill in your details
4. Log in
5. Click "Create My n8n Instance"
6. Wait 30-60 seconds for provisioning
7. Click "Open My n8n Instance"

Your personal n8n instance will open at: `http://user-{your-id}.n8n.localhost`

## Verify Everything Works

### Check Services

```bash
# Portal backend
curl http://localhost:3001/health
# Should return: {"status":"ok","service":"n8n-portal-backend"}

# Provisioner
curl http://localhost:3002/health
# Should return: {"status":"ok","service":"n8n-provisioner","instances":0}

# Keycloak
curl http://localhost:8080/health/ready
# Should return: {"status":"UP"}
```

### Check Containers

```bash
docker ps
```

You should see:
- n8n-postgres
- n8n-keycloak
- n8n-portal-backend
- n8n-portal-frontend
- n8n-provisioner
- n8n-nginx

## Access Admin Interfaces

### Keycloak Admin Console

- **URL**: http://localhost:8080
- **Username**: `admin`
- **Password**: `admin` (change this in `.env` for production!)

### PostgreSQL

```bash
# Connect to PostgreSQL
docker exec -it n8n-postgres psql -U postgres

# List databases
\l

# List n8n user databases
\l | grep n8n_user
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose logs

# Restart specific service
docker compose restart portal-backend
```

### Can't Access Portal

1. Check NGINX is running: `docker ps | grep nginx`
2. Check logs: `docker compose logs nginx`
3. Verify `/etc/hosts` entry

### Can't Access n8n Instance

1. Check container exists: `docker ps | grep n8n-user`
2. Check logs: `docker logs n8n-user-<user-id>`
3. Verify database created: `docker exec n8n-postgres psql -U postgres -l | grep n8n_user`
4. Check wildcard DNS is working

### Instance Provisioning Fails

```bash
# Check provisioner logs
docker compose logs provisioner

# Check if PostgreSQL is accessible
docker exec provisioner ping postgres

# Check Docker socket is mounted
docker exec provisioner ls -la /var/run/docker.sock
```

## Common Commands

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f portal-backend

# User instance
docker logs n8n-user-<user-id>
```

### Restart Services

```bash
# All services
docker compose restart

# Specific service
docker compose restart provisioner
```

### Stop Everything

```bash
# Stop all services
docker compose down

# Stop and remove volumes (DELETES ALL DATA!)
docker compose down -v
```

### List User Instances

```bash
# List containers
docker ps --filter "label=n8n-instance=true"

# List databases
docker exec n8n-postgres psql -U postgres -c "SELECT datname FROM pg_database WHERE datname LIKE 'n8n_user_%';"
```

### Clean Up User Instances

```bash
./scripts/cleanup.sh
```

## Next Steps

1. **Read ARCHITECTURE.md** - Understand how it works
2. **Read DEPLOYMENT.md** - Production deployment guide
3. **Secure Your Setup** - Change default passwords
4. **Enable SSL** - Set up HTTPS for production
5. **Set Up Backups** - Protect your data

## Default Credentials

### Keycloak Admin
- **URL**: http://localhost:8080
- **Username**: `admin`
- **Password**: `admin`
- **⚠️ CHANGE THIS IN PRODUCTION!**

### PostgreSQL
- **Host**: localhost (inside Docker network: postgres)
- **Port**: 5432
- **Username**: `postgres`
- **Password**: `postgres`
- **⚠️ CHANGE THIS IN PRODUCTION!**

## Architecture Overview

```
User Browser
     ↓
NGINX (localhost:80)
     ↓
     ├─→ Portal Frontend (React)
     ├─→ Portal Backend (Express) → Keycloak (auth)
     │                             → Provisioner (create instances)
     │                                    ↓
     │                             Creates Docker containers
     │                             Creates PostgreSQL databases
     └─→ n8n Instance (user-{id}.n8n.localhost)
              ↓
         PostgreSQL Database (n8n_user_{id})
```

## Project Structure

```
multi-tenant-platform/
├── portal/
│   ├── backend/       # Express API server
│   └── frontend/      # React web app
├── provisioner/       # Instance provisioning service
├── nginx/            # Reverse proxy config
├── scripts/          # Utility scripts
├── docker-compose.yml
├── .env             # Your configuration
└── README.md        # Full documentation
```

## Getting Help

- **Check logs first**: `docker compose logs -f`
- **Read README.md**: Comprehensive documentation
- **Read ARCHITECTURE.md**: Technical details
- **Read DEPLOYMENT.md**: Production setup

## Success!

If you've made it this far, you should have:

✅ Portal running at http://localhost
✅ Keycloak admin at http://localhost:8080
✅ Ability to create user accounts
✅ Automatic n8n instance provisioning
✅ Isolated databases per user
✅ Complete data segregation

Enjoy your multi-tenant n8n platform!
