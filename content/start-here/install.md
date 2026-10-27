---
title: "Installation Guide"
description: "Install the Agent, Server, or both on your chosen platform."
weight: 10
url: "/guides/install/"
source: "docs/INSTALL.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

This guide covers installing PrintMaster on all supported platforms.

## Table of Contents

- [Quick Install](#quick-install)
- [Server Installation](#server-installation)
  - [Docker (Recommended)](#docker-recommended)
  - [Unraid](#unraid)
  - [Manual Installation](#manual-server-installation)
- [Agent Installation](#agent-installation)
  - [Windows](#windows)
  - [Linux (Debian/Ubuntu)](#linux-debianubuntu)
  - [Linux (Fedora/RHEL)](#linux-fedorarhel)
  - [macOS](#macos)
  - [Docker](#docker-agent)
- [First-Time Setup](#first-time-setup)

---

## Quick Install

### Server (Docker)

```bash
docker run -d \
  --name printmaster-server \
  -p 9443:9443 \
  -v printmaster-data:/var/lib/printmaster/server \
  -e ADMIN_PASSWORD=your-secure-password \
  ghcr.io/printmaster-org/printmaster-server:latest
```

Access at `https://localhost:9443` with username `admin` and your chosen password. The default certificate is self-signed; use a trusted custom certificate or TLS-terminating proxy for production.

### Agent (Windows)

Download and run the MSI installer from [GitHub Releases](https://github.com/printmaster-org/printmaster/releases).

### Agent (Linux)

```bash
# Debian/Ubuntu
curl -fsSL https://packages.printmaster.work/install.sh | sudo bash
```

---

## Server Installation

The server provides centralized management for multiple agents. If you only need to monitor printers at a single site, you can run the agent standalone without a server.

### Docker (Recommended)

Docker is the recommended deployment method for the server.

#### Prerequisites
- Docker Engine 20.10 or later
- Docker Compose (optional but recommended)

#### Using Docker Run

```bash
# Basic setup
docker run -d \
  --name printmaster-server \
  -p 9443:9443 \
  -v printmaster-data:/var/lib/printmaster/server \
  -v printmaster-logs:/var/log/printmaster/server \
  -e ADMIN_PASSWORD=your-secure-password \
  ghcr.io/printmaster-org/printmaster-server:latest
```

#### Using Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  printmaster-server:
    image: ghcr.io/printmaster-org/printmaster-server:latest
    container_name: printmaster-server
    ports:
      - "9443:9443"
    volumes:
      - printmaster-data:/var/lib/printmaster/server
      - printmaster-logs:/var/log/printmaster/server
    environment:
      - ADMIN_PASSWORD=your-secure-password
      - LOG_LEVEL=info
      - BEHIND_PROXY=false
    restart: unless-stopped

volumes:
  printmaster-data:
  printmaster-logs:
```

Start with:
```bash
docker compose up -d
```

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_PASSWORD` | `printmaster` | Admin password (set before first run!) |
| `LOG_LEVEL` | `info` | Logging level: debug, info, warn, error |
| `BEHIND_PROXY` | `false` | Set to `true` if behind a reverse proxy |
| `BIND_ADDRESS` | `0.0.0.0` | Address to bind to |
| `SERVER_HTTP_PORT` | `9090` | HTTP backend port (only in HTTP proxy mode) |
| `SERVER_HTTPS_PORT` | `9443` | Default standalone HTTPS port |
| `PROXY_USE_HTTPS` | `false` | With `BEHIND_PROXY=true`: HTTP backend if false, HTTPS backend if true |
| `TLS_MODE` | `self-signed` | `self-signed`, `letsencrypt`, or `custom` |

> **Important**: Set a strong `ADMIN_PASSWORD` before exposing the server. At each startup, bootstrap creates `ADMIN_USER` (default `admin`) only if that username is absent. It never resets an existing user's password or role; use user management for password changes.

#### Behind a Reverse Proxy

For proxy-specific setup, TLS modes, WebSocket requirements, and examples, see
[Reverse proxy setup](/deployment/reverse-proxy/). In the common TLS-at-proxy
mode, the Server uses private HTTP port `9090`; do not expose that backend
directly to the internet.

### Unraid

1. **Using Community Applications** (Easiest):
   - Install the Community Applications plugin
   - Search for "PrintMaster Server"
   - Click Install and configure

2. **Manual Docker Setup**:
   - Go to Docker tab → Add Container
   - Repository: `ghcr.io/printmaster-org/printmaster-server:latest`
   - Direct HTTPS port: 9443 → 9443 (HTTP 9090 requires proxy mode)
   - Path: `/mnt/user/appdata/printmaster-server/data` → `/var/lib/printmaster/server`
   - Path: `/mnt/user/appdata/printmaster-server/logs` → `/var/log/printmaster/server`

See [Unraid Deployment Guide](/deployment/unraid/) for detailed instructions.

### Manual Server Installation

Download the server binary from [GitHub Releases](https://github.com/printmaster-org/printmaster/releases) and run:

```bash
# Linux/macOS
./printmaster-server

# Windows
.\printmaster-server.exe
```

---

## Agent Installation

### Windows

#### Server-Generated Bootstrap

The Server's **Add Agent** flow provides a PowerShell one-liner for enrollment
and installation. Run it only from a trusted Server in an elevated PowerShell
session. Treat the generated installation link as a credential; do not share it
in screenshots or logs. Use the existing Agent's supported update or repair
path for an installation that is already present.

The updated Windows bootstrap installs **new Agents only**. Before creating
directories, writing configuration, downloading or installing anything, it
refuses an existing running/stopped Agent service, running Agent process,
Agent uninstall/MSI registration, retained Agent data/binary directory, or a
known protected/legacy Agent executable. Inspection failures also stop it.
It exits nonzero without stopping services, uninstalling packages, deleting old
files or overwriting existing configuration. A Server-only installation does
not itself block enrollment of a new Agent on that machine.

For an existing Agent, use its supported update path or the original installation
owner's repair/uninstall procedure. Review residual files or a partial bootstrap
manually; rerunning the bootstrap is not automatic repair and it will not clean
them up for you. Do not delete retained identity/data just to bypass the guard.

In the updated bootstrap, supported interactive consoles use one transient
progress display rather than accumulating progress bars. Completion removes
the progress display and leaves a short result with the configured executable,
configuration, Agent logs folder and Web UI locations. Warnings and errors remain
visible. Redirected output and consoles without native progress support retain
scrolling status lines. The installer does not clear preexisting console output.
The console display does not establish successful migration or artifact trust.

When installation instructions are emailed, the primary link opens a browser
page with the command, a copy control, and the full script in an expandable
section. The page uses the same expiring enrollment link but does not consume a
one-time download. **Open instructions** in the Add Agent dialog opens the same
page. Its separate **Download script** link and the one-liner still return
the raw script and consume a one-time link when configured. Email clients may
not support copy buttons or `<details>`; the message includes selectable command
text and a plain-text fallback. Treat every enrollment link as a credential.

The Add Agent dialog defaults to a generated bootstrap script; email is an
alternative delivery method. The result screen prioritizes copying the install
command and also lets the administrator copy or open the browser instructions
link. The connection review summarizes the tenant, platform, delivery method,
expiry, and fresh-install/replacement policy before generating the credential.

Script and email onboarding include a separate connection-security review.
Agent-to-Server TLS certificate validation is on by default. Disable it only
when connecting to a self-signed Server and after understanding that an attacker
on the network could impersonate that Server. This setting controls future
Agent-to-Server requests; it does not make the initial bootstrap download secure.
Use a trusted HTTPS Server URL for that download.

One-time onboarding tokens create a pending-install row in the Agents list.
After the Agent registers, that row disappears and the real Agent record appears.
**Replace Agent** enrolls a new Agent identity; it is for a new installation, not
an in-place upgrade or repair of the existing Agent. Use the existing Agent's
supported update or repair path when keeping the same installation. For a
replacement installation, the old Agent remains active until the replacement
successfully registers. The Server then deactivates the old credential, closes
its live connection, transfers device and site ownership to the new Agent, and
retains the old record and history. The Agents list can filter Pending setup and
Deactivated separately from Active, Degraded, and Offline. Deactivated Agents can
be reactivated from their context menu; reactivation makes their existing
credential valid again and does not transfer ownership back automatically.

#### MSI Installer (Recommended)

1. Download the latest MSI from [GitHub Releases](https://github.com/printmaster-org/printmaster/releases)
2. Run the installer
3. The agent will be installed as a Windows service and start automatically
4. Access the web UI at `http://localhost:8080`

#### Manual Installation

```powershell
# Download the binary
Invoke-WebRequest -Uri "https://github.com/printmaster-org/printmaster/releases/latest/download/printmaster-agent-windows-amd64.exe" -OutFile "printmaster-agent.exe"

# Install as service (requires Administrator)
.\printmaster-agent.exe --service install

# Start the service
.\printmaster-agent.exe --service start
```

The raw-binary service installer copies the Agent to
`%ProgramFiles%\PrintMaster\Agent\printmaster-agent.exe` and registers that
protected copy. Service data remains under
`C:\ProgramData\PrintMaster\agent\`. Existing raw-binary services installed
from a different path must be migrated by running `--service update` from an
elevated PowerShell prompt before automatic updates can be applied. Use the MSI
installer to update an MSI-owned installation; do not manually replace its files.

#### Service Management

```powershell
# Check status
Get-Service PrintMasterAgent

# Stop service
.\printmaster-agent.exe --service stop

# Uninstall service
.\printmaster-agent.exe --service uninstall
```

### Linux (Debian/Ubuntu)

#### Server-Generated Bootstrap

The Linux script generated from **Add Agent** installs the package from the
configured repository or falls back to a direct binary. For systemd installs it
creates or reuses the locked-down `printmaster` system account, stores the
enrollment token in `/var/lib/printmaster/agent/server_join_token` with mode
`600`, and runs the service as that account. The script option to skip TLS
certificate validation is off by default; use it only for a self-signed Server
and only with explicit understanding of the interception risk.

#### APT Repository (Recommended)

```bash
# The installer validates the repository signing-key fingerprint,
# configures APT signature verification, and installs the agent.
curl -fsSL https://packages.printmaster.work/install.sh | sudo bash

# The service starts automatically
systemctl status printmaster-agent
```

#### Manual APT Repository Setup

```bash
# Remove old repo 
sudo rm -f /etc/apt/sources.list.d/printmaster.list /etc/apt/sources.list.d/printmaster.sources

# Setup new repo
sudo install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://packages.printmaster.work/gpg.key | \
  sudo gpg --dearmor --yes -o /etc/apt/keyrings/printmaster.gpg
sudo chmod 0644 /etc/apt/keyrings/printmaster.gpg

# Configure APT to trust this key only for the PrintMaster repository
echo "deb [signed-by=/etc/apt/keyrings/printmaster.gpg] https://packages.printmaster.work stable main" | \
  sudo tee /etc/apt/sources.list.d/printmaster.list

# Install
sudo apt-get update
sudo apt-get install -y printmaster-agent
```

#### Manual Installation

```bash
# Download
wget https://github.com/printmaster-org/printmaster/releases/latest/download/printmaster-agent-linux-amd64

# Make executable
chmod +x printmaster-agent-linux-amd64
sudo mv printmaster-agent-linux-amd64 /usr/local/bin/printmaster-agent

# Install as service
sudo printmaster-agent --service install
sudo systemctl start PrintMasterAgent
```

### Linux (Fedora/RHEL)

#### DNF Repository (Recommended)

```bash
# Import GPG key (recommended)
sudo rpm --import https://packages.printmaster.work/gpg.key

# Add repository
sudo dnf config-manager addrepo --from-repofile=https://packages.printmaster.work/printmaster.repo

# Install
sudo dnf install -y printmaster-agent

# The service starts automatically
systemctl status printmaster-agent
```

#### Important Linux Paths

| Path | Description |
|------|-------------|
| `/usr/bin/printmaster-agent` | Agent binary |
| `/etc/printmaster/agent.toml` | Configuration file |
| `/var/lib/printmaster` | Data directory (SQLite DB) |
| `/var/log/printmaster` | Log files |

### macOS

```bash
# Download
curl -LO https://github.com/printmaster-org/printmaster/releases/latest/download/printmaster-agent-darwin-amd64

# Make executable
chmod +x printmaster-agent-darwin-amd64
sudo mv printmaster-agent-darwin-amd64 /usr/local/bin/printmaster-agent

# Install as service
sudo printmaster-agent --service install

# Start service
sudo launchctl load /Library/LaunchDaemons/com.printmaster.agent.plist
```

### Docker Agent

The agent can also run in Docker for specialized deployments:

```bash
docker run -d \
  --name printmaster-agent \
  --network host \
  -v printmaster-agent-data:/var/lib/printmaster/agent \
  ghcr.io/printmaster-org/printmaster-agent:latest
```

> **Note**: `--network host` is required for SNMP discovery to work properly.

---

## First-Time Setup

### Accessing the Web UI

| Component | Default URL | Default Port |
|-----------|-------------|--------------|
| Agent | `http://localhost:8080` | 8080 |
| Server | `https://localhost:9443` | 9443 |

### Server First Login

1. Open `https://your-server:9443` (self-signed certificate by default), or your proxy's public HTTPS URL
2. Log in with:
   - Username: `admin`
   - Password: The password you set via `ADMIN_PASSWORD` (default: `printmaster`)
3. **Change the default password immediately** if you didn't set one during installation

### Connecting an Agent to the Server

1. Open the agent's web UI locally at `http://localhost:8080`. Default `local` auth grants admin bypass to loopback requests, not arbitrary remote clients; use server-authenticated access for remote management
2. Go to **Settings** → **Server Connection**
3. Enter your server URL: `https://your-server:9443`, or your proxy's public HTTPS URL
4. Click **Save**

Or edit the agent's config file:

```toml
[server]
enabled = true
url = "https://your-server:9443"
```

Complete the agent onboarding/approval flow; setting a URL alone does not authorize it. Server HTTPS certificates must be trusted by the agent. The HTTP uploader supports `[server].ca_path`, but the WebSocket dialer at this snapshot does not propagate that custom CA pool. Prefer a system-trusted certificate for both transports; disabling verification is a development-only workaround, not a production recommendation.

### Next Steps

- [Getting Started Guide](/guides/getting-started/) - Configure discovery and scan your first printers
- [Features Guide](/guides/features/) - Learn about all available features
- [Configuration Guide](/guides/configuration/) - Fine-tune your setup

---

## Upgrading

### Docker

```bash
docker pull ghcr.io/printmaster-org/printmaster-server:latest
docker compose down
docker compose up -d
```

### Linux (APT)

```bash
sudo apt-get update
sudo apt-get upgrade printmaster-agent
```

### Linux (DNF)

```bash
sudo dnf upgrade printmaster-agent
```

### Windows

Run the new MSI installer - it will upgrade the existing installation.

For a release update, use the same installation method you selected above and
review the release notes for platform-specific requirements. Automatic update
options depend on the Agent version and installation method.
