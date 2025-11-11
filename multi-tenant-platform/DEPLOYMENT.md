# Deployment Guide

This guide walks you through deploying the n8n multi-tenant platform from scratch.

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+, Debian 11+, or similar)
- **RAM**: Minimum 4GB, recommended 8GB+
- **CPU**: Minimum 2 cores, recommended 4+ cores
- **Disk**: Minimum 20GB free space
- **Docker**: Version 20.10 or later
- **Docker Compose**: Version 2.0 or later

### Port Requirements

The following ports must be available:

- **80**: NGINX reverse proxy (HTTP)
- **8080**: Keycloak (admin console)
- **5432**: PostgreSQL (internal)
- **3001**: Portal backend (internal)
- **3002**: Provisioner (internal)

## Installation Steps

### Step 1: Install Docker

#### Ubuntu/Debian

```bash
# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up stable repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to docker group (logout/login after this)
sudo usermod -aG docker $USER
```

#### Verify Installation

```bash
docker --version
docker compose version
```

### Step 2: Clone and Setup

```bash
# Navigate to the multi-tenant platform directory
cd multi-tenant-platform

# Run setup script
chmod +x scripts/*.sh
./scripts/setup.sh
```

This will:
- Check Docker installation
- Create `.env` file from template
- Pull base Docker images
- Create necessary directories

### Step 3: Configure Environment

Edit the `.env` file:

```bash
nano .env
```

**Important settings to change**:

```env
# Use strong passwords in production!
POSTGRES_PASSWORD=<generate-strong-password>
KEYCLOAK_ADMIN_PASSWORD=<generate-strong-password>

# For production, use a real domain
N8N_BASE_DOMAIN=n8n.yourdomain.com
N8N_PROTOCOL=https
```

**Generate secure passwords**:

```bash
# Generate random passwords
openssl rand -base64 32
```

### Step 4: Configure DNS

For local development:

```bash
# Add to /etc/hosts
sudo nano /etc/hosts
```

Add these lines:

```
127.0.0.1    localhost
127.0.0.1    n8n.localhost
```

**For wildcard subdomains**, install dnsmasq:

```bash
# Ubuntu/Debian
sudo apt-get install dnsmasq

# Configure wildcard
echo "address=/.n8n.localhost/127.0.0.1" | sudo tee /etc/dnsmasq.d/n8n.conf

# Restart dnsmasq
sudo systemctl restart dnsmasq
```

For production, configure real DNS:

```
A    n8n.yourdomain.com              -> <your-server-ip>
A    *.n8n.yourdomain.com            -> <your-server-ip>
```

### Step 5: Start Services

```bash
# Start all services in detached mode
docker compose up -d

# Check status
docker compose ps

# Follow logs
docker compose logs -f
```

Expected output:

```
NAME                 STATUS
n8n-keycloak        running
n8n-postgres        running
n8n-portal-backend  running
n8n-portal-frontend running
n8n-provisioner     running
n8n-nginx           running
```

### Step 6: Initialize Keycloak

Wait for Keycloak to be fully started (check logs), then:

```bash
./scripts/init-keycloak.sh
```

This script will:
- Create the `n8n-platform` realm
- Create the `n8n-portal` client
- Configure redirect URIs

### Step 7: Verify Deployment

#### Check Service Health

```bash
# Portal backend
curl http://localhost:3001/health

# Provisioner
curl http://localhost:3002/health

# Keycloak
curl http://localhost:8080/health/ready
```

#### Access Services

1. **Portal**: http://localhost
2. **Keycloak Admin**: http://localhost:8080
   - Username: `admin`
   - Password: (from `.env`)

### Step 8: Create First User

1. Go to http://localhost
2. Click "Sign In with Keycloak"
3. Click "Register" on Keycloak login page
4. Fill in user details
5. Log in
6. Click "Create My n8n Instance"
7. Wait for provisioning (30-60 seconds)
8. Click "Open My n8n Instance"

## Production Deployment

### SSL/TLS Configuration

#### Using Let's Encrypt with Traefik

Replace NGINX with Traefik for automatic SSL:

```yaml
# Add to docker-compose.yml
traefik:
  image: traefik:v2.10
  command:
    - "--providers.docker=true"
    - "--entrypoints.web.address=:80"
    - "--entrypoints.websecure.address=:443"
    - "--certificatesresolvers.myresolver.acme.email=your@email.com"
    - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
    - "--certificatesresolvers.myresolver.acme.httpchallenge.entrypoint=web"
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - ./letsencrypt:/letsencrypt
```

#### Using NGINX with Manual Certificates

```bash
# Generate self-signed certificate (testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/nginx.key \
  -out nginx/ssl/nginx.crt

# Update nginx.conf to use SSL
# Add server block listening on 443
```

### External Database

For production, use managed PostgreSQL:

**Update `.env`**:

```env
POSTGRES_HOST=your-db-host.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_USER=n8n_admin
POSTGRES_PASSWORD=<strong-password>
```

**Remove postgres service from docker-compose.yml**

### Persistent Storage

Add volumes for n8n data:

```yaml
# In each n8n container (created by provisioner)
volumes:
  - n8n-user-${userId}-data:/home/node/.n8n
```

Update `provisioner/src/docker-manager.js` to create volumes.

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp  # Keycloak (optional, for admin)
sudo ufw enable

# iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

### Resource Limits

Update `.env` to set instance limits:

```env
N8N_MEMORY_LIMIT=1g
N8N_CPU_LIMIT=2
```

### Backup Strategy

#### Database Backup

```bash
# Backup all databases
docker exec n8n-postgres pg_dumpall -U postgres > backup-$(date +%Y%m%d).sql

# Restore
cat backup-20241201.sql | docker exec -i n8n-postgres psql -U postgres
```

#### Automated Backups

Create a cron job:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/multi-tenant-platform && ./scripts/backup.sh
```

Create `scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups/n8n"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
docker exec n8n-postgres pg_dumpall -U postgres | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup Keycloak data
docker exec n8n-postgres pg_dump -U postgres keycloak | gzip > "$BACKUP_DIR/keycloak_$DATE.sql.gz"

# Keep only last 7 days
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

### Monitoring Setup

#### Prometheus + Grafana

Add to `docker-compose.yml`:

```yaml
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
    - prometheus_data:/prometheus
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana
  volumes:
    - grafana_data:/var/lib/grafana
  ports:
    - "3000:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
```

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'docker'
    static_configs:
      - targets: ['host.docker.internal:9323']
```

#### Container Monitoring

```bash
# Install cAdvisor
docker run -d \
  --name=cadvisor \
  --volume=/:/rootfs:ro \
  --volume=/var/run:/var/run:ro \
  --volume=/sys:/sys:ro \
  --volume=/var/lib/docker/:/var/lib/docker:ro \
  --publish=8081:8080 \
  gcr.io/cadvisor/cadvisor:latest
```

### Logging

#### Centralized Logging with Loki

```yaml
loki:
  image: grafana/loki
  ports:
    - "3100:3100"
  volumes:
    - loki_data:/loki

promtail:
  image: grafana/promtail
  volumes:
    - /var/log:/var/log
    - /var/lib/docker/containers:/var/lib/docker/containers:ro
    - ./promtail.yml:/etc/promtail/promtail.yml
  command: -config.file=/etc/promtail/promtail.yml
```

## Scaling

### Horizontal Scaling

To scale across multiple hosts:

1. **Deploy Kubernetes** or **Docker Swarm**
2. **Use external PostgreSQL** (AWS RDS, Google Cloud SQL)
3. **Use Redis** for shared state (replace instance-tracker)
4. **Use external load balancer**

### Vertical Scaling

Increase resources per host:

```bash
# Increase Docker resources
# Edit /etc/docker/daemon.json
{
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  }
}

sudo systemctl restart docker
```

## Maintenance

### Update n8n Version

```bash
# Update image in .env
N8N_IMAGE=n8nio/n8n:1.15.0

# Pull new image
docker pull n8nio/n8n:1.15.0

# Recreate instances (requires downtime)
# Users will need to restart their instances
```

### Update Platform Components

```bash
# Pull latest changes
cd multi-tenant-platform

# Rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Clean Up Old Instances

```bash
# Run cleanup script
./scripts/cleanup.sh

# Or manually
docker ps -a --filter "label=n8n-instance=true" --format "{{.Names}}" | xargs docker rm -f
```

## Troubleshooting

### Logs

```bash
# View all logs
docker compose logs

# Follow specific service
docker compose logs -f portal-backend

# View n8n instance logs
docker logs n8n-user-<user-id>
```

### Common Issues

**Portal can't connect to Keycloak**
```bash
# Check Keycloak is running
docker ps | grep keycloak

# Check network
docker network inspect n8n-platform

# Restart services
docker compose restart portal-backend
```

**Can't access n8n instance**
```bash
# Check container is running
docker ps | grep n8n-user

# Check logs
docker logs n8n-user-<user-id>

# Check database exists
docker exec n8n-postgres psql -U postgres -l | grep n8n_user
```

**Database connection failed**
```bash
# Check PostgreSQL
docker exec n8n-postgres pg_isready

# Check credentials
docker exec n8n-postgres psql -U postgres -c "SELECT usename FROM pg_user;"
```

## Security Checklist

- [ ] Change default Keycloak admin password
- [ ] Change default PostgreSQL password
- [ ] Enable SSL/TLS for all services
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Enable audit logging
- [ ] Configure resource limits
- [ ] Use strong JWT secrets
- [ ] Implement rate limiting
- [ ] Set up monitoring and alerts
- [ ] Review Keycloak security settings
- [ ] Enable 2FA for admin accounts
- [ ] Regular security updates

## Performance Tuning

### PostgreSQL

```sql
-- Connect to postgres
docker exec -it n8n-postgres psql -U postgres

-- Tune settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';

-- Restart PostgreSQL
docker compose restart postgres
```

### Docker

```bash
# Increase limits in /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-address-pools": [
    {"base":"10.10.0.0/16","size":24}
  ]
}
```

## Conclusion

Your multi-tenant n8n platform is now deployed! Users can register, authenticate, and receive their own isolated n8n instances automatically.

For production use, ensure you've:
- Configured SSL/TLS
- Set up backups
- Configured monitoring
- Hardened security settings
- Reviewed the Security Checklist above

For questions or issues, refer to the ARCHITECTURE.md file or the main README.md.
