---
title: "Docker Deployment"
source: "docs/deployment/docker.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

Deploy PrintMaster Server using Docker containers with multi-architecture support.

## Quick Start

```bash
docker run -d \
  --name printmaster-server \
  -p 9443:9443 \
  -v printmaster-data:/var/lib/printmaster/server \
  -e ADMIN_PASSWORD=your-secure-password \
  ghcr.io/printmaster-org/printmaster-server:latest
```

Access at `https://localhost:9443` with username `admin`. Standalone mode is HTTPS-only with a self-signed certificate by default; HTTP `9090` is a reverse-proxy backend, not the default listener.

Set a strong bootstrap password before exposing the server. At every startup, `ADMIN_USER` (default `admin`) is created only if that username is absent. `ADMIN_PASSWORD` does not reset an existing account's password or role.

---

## Supported Architectures

All images are built for multiple architectures automatically:

| Architecture | Platform | Use Case |
|--------------|----------|----------|
| `linux/amd64` | x86_64 servers | Intel/AMD servers, cloud VMs |
| `linux/arm64` | ARM 64-bit | Apple Silicon, AWS Graviton, Raspberry Pi 4+ |
| `linux/arm/v7` | ARM 32-bit | Raspberry Pi 3/4 (32-bit OS) |

Docker automatically pulls the correct architecture for your platform.

## Image Details

**Runtime base image**: `alpine:3.21`, with a shell, `su-exec`, and SQLite tooling.
- **User**: The image sets `PUID=0` and `PGID=0`, so it runs as root by default, not UID 65532.
- **Privilege drop**: Set nonzero `PUID`/`PGID` to run the server under the chosen IDs. The entrypoint starts as root, fixes volume ownership, then uses `su-exec`.
- **Permissions**: Ensure writable data/log volumes for the selected IDs. Do not assume a distroless or read-only-root-filesystem deployment.

**Image tags:**
- `latest` - Latest stable release (recommended)
- `v0.23.6` - Specific version

---

## Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  printmaster-server:
    image: ghcr.io/printmaster-org/printmaster-server:latest
    container_name: printmaster-server
    ports:
      - "9443:9443"  # Default standalone HTTPS
    volumes:
      - printmaster-data:/var/lib/printmaster/server
      - printmaster-logs:/var/log/printmaster/server
    environment:
      - ADMIN_PASSWORD=your-secure-password
      - BIND_ADDRESS=0.0.0.0
      - LOG_LEVEL=info
      - PM_DISABLE_SELFUPDATE=true
      - PUID=1000  # Choose IDs suitable for your host volumes
      - PGID=1000
    restart: unless-stopped

volumes:
  printmaster-data:
  printmaster-logs:
```

Start with:
```bash
docker compose up -d
```

---

## Environment Variables

### Essential

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_PASSWORD` | `printmaster` | **Set before first run!** |
| `BIND_ADDRESS` | `0.0.0.0` | Bind address; restrict exposure with firewall/proxy |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |

### Network & Ports

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_HTTP_PORT` | `9090` | HTTP backend port when `BEHIND_PROXY=true` and `PROXY_USE_HTTPS=false` |
| `SERVER_HTTPS_PORT` | `9443` | Default standalone HTTPS or encrypted proxy backend |
| `BEHIND_PROXY` | `false` | Set `true` if behind reverse proxy |
| `PROXY_USE_HTTPS` | `false` | `false`: HTTP upstream; `true`: HTTPS upstream on `9443` (with `BEHIND_PROXY=true`) |

### TLS/HTTPS

| Variable | Default | Description |
|----------|---------|-------------|
| `TLS_MODE` | `self-signed` | `self-signed`, `letsencrypt`, `custom` |
| `TLS_CERT_PATH` | — | Certificate path (`custom` mode; mount the file) |
| `TLS_KEY_PATH` | — | Key path (`custom` mode; mount the file) |

### Let's Encrypt

| Variable | Description |
|----------|-------------|
| `LETSENCRYPT_DOMAIN` | Domain for certificate |
| `LETSENCRYPT_EMAIL` | Notification email |
| `LETSENCRYPT_ACCEPT_TOS` | Accept ToS (`true`) |

Direct Let's Encrypt mode also needs public HTTP challenge access on port `80`; the examples above do not publish it. For TLS termination at a proxy, configure certificates there instead. `none`, `disabled`, `acme`, and `manual` are not supported server TLS modes.

### Agent Management

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTO_APPROVE_AGENTS` | `false` | Auto-approve new agents |
| `AGENT_TIMEOUT_MINUTES` | `15` | Timeout before marking offline |

### Container Detection

| Variable | Effect |
|----------|--------|
| `PM_DISABLE_SELFUPDATE` | Disable self-update (recommended for Docker) |
| `CONTAINER=docker` | Auto-detected, disables self-update |

See [Environment Variables Reference](/guides/configuration/#environment-variables) for selected configuration variables, including `SERVER_DB_DRIVER`/`DB_DRIVER` and `SERVER_DB_DSN`/`DB_DSN` for PostgreSQL. SQLite TOML uses `[database].driver` and `path`; PostgreSQL uses `driver = "postgres"` and `dsn`, not `type`/`postgres_url`.

---

## Behind a Reverse Proxy

### Nginx Proxy Manager / Traefik / Caddy

```yaml
environment:
  - BEHIND_PROXY=true
  - BIND_ADDRESS=0.0.0.0
  - PROXY_USE_HTTPS=false  # Proxy terminates TLS; server upstream is HTTP
```

**Reverse proxy requirements:**
- Forward to port `9090`
- Enable **WebSocket support** (required for real-time features)
- Handle SSL termination

Change the port mapping to `9090:9090` for a host proxy, or route privately to `printmaster-server:9090` on a shared container network. Restrict backend access to the proxy. For an HTTPS upstream, set `PROXY_USE_HTTPS=true` and forward to `https://printmaster-server:9443` instead.

### Nginx Configuration Example

```nginx
server {
    listen 443 ssl;
    server_name printmaster.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://printmaster-server:9090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Volumes & Data

### Recommended Volume Mounts

| Container Path | Purpose |
|----------------|---------|
| `/var/lib/printmaster/server` | Database and config |
| `/var/log/printmaster/server` | Log files |

The TimescaleDB PostgreSQL 18 Compose image mounts its database volume at
`/var/lib/postgresql`. Do not change this to `/var/lib/postgresql/data`; that
older mount layout can prevent the PG18 image from finding its data directory.

For PostgreSQL major-version migrations and TimescaleDB restore hooks, see
[PostgreSQL and TimescaleDB Upgrades](/deployment/database-upgrade/).

### Backup

```bash
# Stop container first for consistent backup
docker stop printmaster-server

# Backup database
docker cp printmaster-server:/var/lib/printmaster/server/printmaster.db ./backup-$(date +%Y%m%d).db

# Restart
docker start printmaster-server
```

---

## Health Check

The server provides a built-in health probe which selects the configured HTTP or HTTPS listener and handles local self-signed TLS:

```bash
docker exec printmaster-server /printmaster-server -health
```

Add to the Compose service:

```yaml
healthcheck:
  test: ["CMD", "/printmaster-server", "-health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

---

## Updating

```bash
# Pull latest image
docker pull ghcr.io/printmaster-org/printmaster-server:latest

# Recreate container
docker compose down
docker compose up -d

# Check version
docker logs printmaster-server | head -5
```

## PostgreSQL and TimescaleDB upgrades

The repository Compose examples use `timescale/timescaledb:latest-pg18` for
new deployments. Changing a PostgreSQL major version while reusing an existing
database volume is not a valid upgrade and can make the database refuse to
start. Never delete the old volume as a workaround.

For the required backup, new-volume migration, and verification steps, see
[PostgreSQL and TimescaleDB Upgrades](/deployment/database-upgrade/).

---

## Agent in Docker

For specialized deployments (not typical):

```bash
docker run -d \
  --name printmaster-agent \
  --network host \
  -v printmaster-agent-data:/var/lib/printmaster/agent \
  -e SERVER_ENABLED=true \
  -e SERVER_URL=https://your-server:9443 \
  ghcr.io/printmaster-org/printmaster-agent:latest
```

> **Note**: `--network host` is required for SNMP discovery to work properly.

Complete onboarding and use a certificate trusted by the agent for HTTP uploads and WSS. At this snapshot, the WebSocket client does not propagate the custom CA pool used by the HTTP uploader; do not treat `SERVER_CA_PATH` alone as a complete WSS trust solution.

---

## See Also

- [Unraid Deployment](/deployment/unraid/)
- [Installation Guide](/guides/install/)
- [Configuration Guide](/guides/configuration/)

