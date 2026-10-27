---
title: "Unraid Deployment"
source: "docs/deployment/unraid.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

Deploy PrintMaster Server on Unraid using the Docker container.

---

## Installation Methods

### Method 1: Community Applications (Recommended)

1. Install **Community Applications** plugin if not already installed
2. Search for "PrintMaster Server"
3. Click **Install**
4. Configure settings (see below)
5. Click **Apply**

### Method 2: Manual Docker Setup

1. Go to **Docker** tab in Unraid
2. Click **Add Container**
3. Configure:

| Setting | Value |
|---------|-------|
| Name | `PrintMaster-Server` |
| Repository | `ghcr.io/printmaster-org/printmaster-server:latest` |
| Network Type | `Bridge` |
| Port | `9443` → `9443` (TCP) for direct HTTPS; keep `9090` private for proxy mode |
| Optional proxy port | `9090` → `9090` (TCP), only if the proxy needs a host-published backend; restrict access |
| Volume | `/mnt/user/appdata/printmaster-server/data` → `/var/lib/printmaster/server` |
| Volume | `/mnt/user/appdata/printmaster-server/logs` → `/var/log/printmaster/server` |

---

## Configuration

### Essential Settings

| Setting | Value | Description |
|---------|-------|-------------|
| **Direct HTTPS Port** | `9443` | Default web interface and API |
| **Proxy HTTP Port** | `9090` | Private backend only when reverse-proxy mode is enabled |
| **Data Directory** | `/mnt/user/appdata/printmaster-server/data` | Database storage |
| **Logs Directory** | `/mnt/user/appdata/printmaster-server/logs` | Application logs |
| **Timezone** | Your timezone (e.g., `America/New_York`) | For correct timestamps |

### Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `BIND_ADDRESS` | `0.0.0.0` | Allow external access |
| `SERVER_DB_DRIVER` | `sqlite` | Use SQLite for the local Server database |
| `SERVER_DB_PATH` | `/var/lib/printmaster/server/server.db` | Store SQLite inside the mounted data directory |
| `BEHIND_PROXY` | `false` by default | Set `true` only when using a reverse proxy |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `TZ` | `America/New_York` | Your timezone |
| `PM_DISABLE_SELFUPDATE` | `true` | Recommended for Docker |

---

## Reverse Proxy Setup

For Nginx Proxy Manager or another proxy, follow the complete
[Reverse proxy setup](/deployment/reverse-proxy/) guide. In the common TLS-at-
proxy configuration, set `BEHIND_PROXY=true` and `PROXY_USE_HTTPS=false`, then
forward privately to the Server's HTTP listener on port `9090`. Enable WebSocket
support and do not expose that backend port to the internet. In Unraid's Docker
template, add the `9090` mapping only if the proxy needs a host-published port;
on a shared container network, route to the Server container directly instead.

## Direct HTTPS (no reverse proxy)

| Variable | Value |
|----------|-------|
| `BEHIND_PROXY` | `false` |
| `TLS_MODE` | `self-signed` |
| `SERVER_HTTPS_PORT` | `9443` |

Map port `9443`. Do not publish port `9090` unless you deliberately configure
proxy mode.

---

## File Locations

### On Unraid Host

```
/mnt/user/appdata/printmaster-server/
├── data/
│   ├── server.db           # SQLite database
│   └── config.toml         # Configuration (optional)
└── logs/
    └── server.log          # Application logs
```

### Inside Container

```
/var/lib/printmaster/server/    # Data
/var/log/printmaster/server/    # Logs
```

---

## First-Time Setup

1. **Start the container**
   - Database and config created automatically

2. **Access the Web UI**
   - Direct: `https://YOUR-UNRAID-IP:9443` (the default self-signed certificate triggers a browser warning)
   - Via Proxy: `https://printmaster.yourdomain.com`

3. **Login**
   - Username: `admin`
   - Password: `printmaster` (change immediately!)

4. **Connect Agents**
   - Agent config: `server_url = "https://YOUR-UNRAID-IP:9443"`, or use the proxy's public HTTPS URL

---

## Updating

### Via Unraid UI

1. Go to **Docker** tab
2. Click **Check for Updates**
3. Click **Update** if available

### Via Community Applications

Use **CA Auto Update Applications** plugin for automatic updates.

---

## Backup

Back up the full appdata directory, including the configured database, custom
`config.toml`, and any mounted TLS files. A backup plugin must quiesce the
container or use a database-aware snapshot; copying a running SQLite file is
not a verified backup. Follow [Backup & restore](/deployment/backup-restore/)
for consistent copies and isolated recovery tests. Keep at least one encrypted
copy outside the Unraid host.

---

## Troubleshooting

### Container Won't Start

1. Check logs: Docker tab → Click container → **Logs**
2. Verify appdata folder permissions
3. Ensure the selected listener is available: `9443` for direct HTTPS or `9090` for proxy mode

### Can't Access Web UI

```bash
# From Unraid terminal
docker exec PrintMaster-Server /printmaster-server --health
```

### Permission Errors

```bash
# Fix permissions
chown -R 99:100 /mnt/user/appdata/printmaster-server/
chmod -R 755 /mnt/user/appdata/printmaster-server/
```

> Container uses UID 99, matching Unraid's `nobody` user.

### 502 Bad Gateway (Nginx Proxy Manager)

- Ensure `BEHIND_PROXY=true`
- Use `http://` in NPM (not https)
- Enable WebSockets in proxy settings

### View Logs

```bash
docker logs -f PrintMaster-Server
```

---

## Integration with Other Apps

### Uptime Kuma

Monitor PrintMaster availability:
- URL: `http://printmaster-server:9090/api/v1/health`

### Nginx Proxy Manager

- Install from Community Applications
- Create proxy host for PrintMaster
- Use Let's Encrypt for SSL

---

## Complete Example

```
Container Name: PrintMaster-Server
Repository: ghcr.io/printmaster-org/printmaster-server:latest
Network Type: bridge

Ports:
   9443/tcp → 9443 (direct HTTPS, optional when using only a proxy)
   9090/tcp → 9090 (proxy backend only; restrict access to the proxy)

Volumes:
  /mnt/user/appdata/printmaster-server/data → /var/lib/printmaster/server
  /mnt/user/appdata/printmaster-server/logs → /var/log/printmaster/server

Environment Variables:
  BIND_ADDRESS=0.0.0.0
   SERVER_DB_DRIVER=sqlite
   SERVER_DB_PATH=/var/lib/printmaster/server/server.db
  BEHIND_PROXY=true
   PROXY_USE_HTTPS=false
  LOG_LEVEL=info
  TZ=America/Chicago
  PM_DISABLE_SELFUPDATE=true
```

Works with Nginx Proxy Manager at `https://printmaster.mydomain.com`.

---

## See Also

- [Docker Deployment](/deployment/docker/)
- [Configuration Guide](/guides/configuration/)
- [Installation Guide](/guides/install/)

