---
title: "PrintMaster Server"
source: "server/README.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

The server is the central fleet-management hub for site agents. This guide was checked against source snapshot `565f4c0`; it replaces the obsolete early-development overview, not a full server/API audit.

## Architecture

Agents discover printers locally, retain a local database, and send inventory, metrics, and heartbeats to the server. An authenticated persistent WebSocket carries agent communication and remote UI proxy requests; HTTP endpoints also support agent communication. The server stores fleet data in SQLite (default) or PostgreSQL and serves an embedded browser UI.

## Features

- **Multi-Agent Management** - Register and monitor multiple agents
- **Centralized Storage** - All device data and metrics in one place
- **Real-time Monitoring** - Live status from all connected agents
- **Reporting** - Cross-site fleet reports and analytics
- **Alerting** - Notifications for toner low, errors, offline devices
- **Web UI** - Manage entire fleet from browser

The reviewed source also implements onboarding/approval, user sessions, tenant-aware authorization, managed settings, and update policies. Seeded toner rules warn at or below 20% and become critical at or below 5%; dedicated drum/fuser/waste-toner threshold alerts are not implemented in the reviewed evaluator.

## Quick Start

### Build

```powershell
# From project root
cd server
go build -o printmaster-server.exe .
```

### Run

```powershell
# Default standalone listener: HTTPS 9443, self-signed certificate
.\printmaster-server.exe

# Generate supported TOML configuration
.\printmaster-server.exe -config config.toml -generate-config
```

Default bind address is `0.0.0.0`; HTTP `9090` is not also served in standalone mode. Use TOML or supported env variables for ports, DB paths, and logging. Neither `-port`, `-db`, `-data-dir`, nor `-log-level` is supported.

Set a strong `ADMIN_PASSWORD` before exposing the server. Each startup creates `ADMIN_USER` (default `admin`) only if that username is absent; it never resets an existing password or role. Use user management for password changes.

For containers, see [Docker Deployment](/deployment/docker/). The server image uses Alpine and defaults to root (`PUID=0`, `PGID=0`); select suitable nonzero IDs to drop privileges.

### Configure Agents

Point agents to server in their config:

```toml
[server]
enabled = true
url = "https://your-server:9443"
name = "Site A"
```

Complete agent onboarding/approval. Agent identity is a persisted UUID, not a manually assigned site name. Use a certificate trusted by the agent: the HTTP uploader supports a custom CA file, but the WebSocket dialer does not receive that custom CA pool at this snapshot. Prefer a system-trusted certificate for both transports; disabling verification is not a production recommendation.

## API Endpoints

Use the [API Reference](/api/) and current handlers for integration details. Old scaffold payloads are removed; this overview does not validate request schemas or authenticate every endpoint.

### Agent API (v1)

Agent operations require the appropriate onboarding/token context. Browser/user sessions and agent tokens are not interchangeable.

#### Register Agent

Complete registration through the supported onboarding/approval flow. See [Installation Guide](/guides/install/#connecting-an-agent-to-the-server).

#### Heartbeat

Agents report liveness and version/settings metadata; the server uses this for connectivity and managed settings.

#### Upload Devices

Agents upload inventory associated with their persistent identity. Current API handlers define payload requirements.

#### Upload Metrics

Time-series metrics are separate from inventory. Current API handlers define payload requirements.

## Development Status

The server is implemented well beyond the original 0.1.0 scaffold. Check the installed binary with `-version`; no current release number is asserted here.

### Implemented
Database storage, authenticated UI, agent communication, alerting/reporting, health checks, and TLS certificate modes exist in the reviewed source.

### TODO
See current project planning for future work. The old scaffold checklist is not a current roadmap or a promise of shipped security controls.

## Database Schema (Planned)

**Historical heading retained for links.** Storage is implemented, not merely planned. Runtime migrations and storage code are authoritative; the simplified lists formerly here were not an accurate schema reference.

### agents

Persisted agent identity, onboarding/status, and connection metadata.

### devices

Inventory records associated with agents; metrics are stored separately.

### metrics_history

Historical metrics use backend time-series tables and retention/aggregation logic. This historical heading is not a literal schema guarantee.

## Version Strategy

Agent and server have component versions plus a communication protocol version. Use compatible releases; this guide does not promise compatibility across every 0.x/1.x combination.

## Configuration

### Environment Variables

```bash
SERVER_HTTP_PORT=9090         # HTTP backend in proxy mode
SERVER_HTTPS_PORT=9443        # Default standalone HTTPS
SERVER_DB_PATH=/path/to/db    # SQLite path
SERVER_LOG_LEVEL=info         # Log level; LOG_LEVEL is fallback
```

For an HTTP backend behind a TLS-terminating proxy, set both `BEHIND_PROXY=true` and `PROXY_USE_HTTPS=false`, forwarding to `http://server:9090`. Restrict backend access, configure trusted proxies, and enable WebSocket passthrough. `PROXY_USE_HTTPS=true` selects `https://server:9443` instead.

TLS modes are `self-signed` (default), `letsencrypt`, and `custom`. PostgreSQL uses `SERVER_DB_DRIVER=postgres` and `SERVER_DB_DSN` (generic `DB_DRIVER`/`DB_DSN` are fallbacks).

### config.ini (future)

**Historical heading retained for links.** INI is not supported; use TOML:

```toml
[server]
http_port = 9090
https_port = 9443
behind_proxy = false
proxy_use_https = false
bind_address = "0.0.0.0"

[tls]
mode = "self-signed"
domain = "localhost"

[database]
driver = "sqlite"
path = "/var/lib/printmaster/server/printmaster.db"

[logging]
level = "info"
```

PostgreSQL uses `[database].driver = "postgres"` and `dsn`, not `type`/`postgres_url`. See [Configuration Guide](/guides/configuration/) for TLS, bootstrap, startup flags, and managed-setting caveats.

## License

Same as PrintMaster Agent (see root LICENSE file)

