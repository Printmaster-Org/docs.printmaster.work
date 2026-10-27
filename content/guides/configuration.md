---
title: Configuration Guide
linkTitle: Configuration
description: Configure discovery, Agent connections, Server listeners, and storage.
weight: 20
source: "docs/CONFIGURATION.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

PrintMaster has two configuration layers:

- **Startup configuration** comes from built-in defaults, a TOML file, and supported environment variables. Use this for listeners, database connections, TLS, and service paths.
- **Application settings** are managed in the Agent or Server web UI. Fleet-managed Agent settings can inherit values from the Server and may be locked by an administrator.

Use the configuration file and environment names supported by your installed release. Unknown TOML keys may be ignored or rejected. Examples below show the common supported settings; they are not a complete schema.

## Agent discovery and SNMP

The Agent's **Settings** page is the preferred way to adjust discovery ranges, SNMP access, scan concurrency, and collection intervals. See [IP ranges for discovery](/guides/ip-ranges/) for accepted range formats.

For startup configuration, the Agent TOML file is normally located at:

| Platform | Path |
| --- | --- |
| Windows | `C:\ProgramData\PrintMaster\agent\config.toml` |
| Linux | `/etc/printmaster/agent/config.toml` |
| macOS | `/Library/Application Support/PrintMaster/agent/config.toml` |
| Docker | `/var/lib/printmaster/agent/config.toml` |

Common SNMP settings use an `[snmp]` section:

```toml
[snmp]
community = "replace-with-your-read-only-community"
timeout_ms = 2000
retries = 1
```

Use the credentials and protocol version configured on your printers. Prefer a read-only SNMP identity, restrict access to Agent hosts, and do not share community strings. SNMPv3 fields are available in supported versions; confirm the installed Agent's Settings page and help before copying version-specific values.

When an Agent is connected to a Server, the Server may manage selected sections such as Discovery, SNMP, Features, or Local Printers. Check **Settings → Fleet** for the current scope and whether a section is inherited, overridden, or enforced. Local web listener and logging settings are separate from fleet-managed sections.

## Connect an Agent to a Server

An Agent can run standalone or report to a central Server. The connection is configured under **Settings → Server Connection** or in the Agent TOML file:

```toml
[server]
enabled = true
url = "https://printmaster.example.com"
```

Use the Server URL and enrollment flow provided by your administrator. Agent tokens are credentials: do not paste them into tickets or share them in screenshots. For setup steps, see [Installation](/guides/install/) and [Authentication boundaries](/guides/authentication-boundaries/).

## Server listeners and TLS

The Server's standalone listener uses HTTPS on port `9443` by default. HTTP on port `9090` is intended as a reverse-proxy backend and requires proxy mode. If TLS terminates at the proxy, restrict the backend listener to that proxy and enable WebSocket forwarding. For encrypted proxy-to-Server traffic, configure the HTTPS upstream instead. See [Reverse proxy setup](/deployment/reverse-proxy/) for complete product-specific configuration examples.

The Server TOML file is normally located at:

| Platform | Path |
| --- | --- |
| Windows | `C:\ProgramData\PrintMaster\server\config.toml` |
| Linux | `/etc/printmaster/server/config.toml` |
| macOS | `/Library/Application Support/PrintMaster/server/config.toml` |
| Docker | `/var/lib/printmaster/server/config.toml` |

Use `[server]`, `[tls]`, and `[database]` sections in TOML. A minimal HTTPS listener example:

```toml
[server]
https_port = 9443
behind_proxy = false

[tls]
mode = "self-signed"
```

Supported TLS modes are `self-signed`, `letsencrypt`, and `custom`. A self-signed certificate is suitable for initial setup, but production clients should trust the certificate presented by the Server. Configure custom certificate paths or Let's Encrypt settings according to the [Docker deployment guide](/deployment/docker/) and your proxy design.

## Database configuration

SQLite is the default for a single Server. PostgreSQL is available for deployments that need an external database. Keep the database credentials private and back up the database before upgrades. See [database upgrades](/deployment/database-upgrade/) before changing PostgreSQL major versions.

```toml
[database]
driver = "sqlite"
path = "/var/lib/printmaster/server/printmaster.db"
```

For PostgreSQL, set `driver = "postgres"` and provide the supported DSN through the configuration or environment variable. Do not change the database engine by pointing an existing data directory at a different image version.

## Environment variables and changes

Environment variables are useful for container deployments. The Docker guide lists the Server's listener, TLS, database, and bootstrap variables. Set `ADMIN_PASSWORD` before the first Server start; it creates the initial account and does not reset an existing user's password.

After changing startup configuration, restart the affected service when that setting requires it. Changes made in the web UI are saved through the application's settings controls. Environment-provided Server values may be locked against UI overrides. If a control is unavailable or read-only, ask the Server administrator to change the configuration at its owning scope.

For hosting examples, see [Docker deployment](/deployment/docker/). For connection and discovery problems, see [Troubleshooting](/guides/troubleshooting/).
