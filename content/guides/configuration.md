---
title: "Configuration Guide"
linkTitle: "Configuration"
source: "docs/CONFIGURATION.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

Configuration guide checked against source snapshot `565f4c0`. This is a targeted accuracy pass, not an exhaustive reference.

## Table of Contents

- [Configuration Methods](#configuration-methods)
- [Agent Configuration](#agent-configuration)
- [Server Configuration](#server-configuration)
- [Environment Variables](#environment-variables)
- [Command Line Options](#command-line-options)

---

## Configuration Methods

Startup configuration uses built-in defaults, TOML, then supported environment overrides. `-config` selects the file; CLI flags are not a generic override mechanism for settings.

Managed/UI settings are a separate layer. On the server, environment-set keys are locked against managed overrides. Agent runtime web settings also use persisted unified settings; do not assume every TOML key wins over UI settings.

### Fleet settings and Agent ownership

Fleet consistency details below were reviewed against [backend settings/runtime commit 9c5c0b4](https://github.com/Printmaster-Org/printmaster/commit/9c5c0b41ef1e53242cce04f4304116cb97b0d765) and [channel/settings UI commit e8bdb99](https://github.com/Printmaster-Org/printmaster/commit/e8bdb99ab27c9bf9a23d3f00a534977676672003). Other sections retain their earlier source review.

Beta build defaults and automatic prerelease intake were reviewed against
[source commit 869a0c1](https://github.com/Printmaster-Org/printmaster/commit/869a0c1174257409f8eb18fbe61612f34998b471);
see the [Beta release lifecycle](/development/build-workflow/#beta-cycle-and-stable-promotion)
for release commands and publishing limitations.

In **Settings → Fleet**, choose the global, customer, or individual Agent scope. Fleet values resolve from global defaults through customer overrides to permitted Agent overrides; customer-enforced sections cannot be overridden for an individual Agent.

**Section Management** controls Discovery, SNMP, Features, and Local Printers. Only checked sections override Agent-local settings. Unchecked sections retain the Agent's persisted configuration, including after restart. Logging, web listeners, detected subnet, and the two discovery display preferences (**Show Manual Discover Button** and **Show Discovered Devices**) remain local. Disabling management restores local values; it does not copy the former fleet values into the Agent's standalone settings.

Fleet controls for unmanaged sections are read-only at every scope, including customer scope, rather than accepting overrides the Agent would ignore. The Agent disables managed controls and excludes them from Apply/auto-save, so changing local logging or web settings does not attempt to overwrite fleet settings. Its local settings endpoint rejects managed changes with HTTP 409, except the two local display preferences. Reset clears local settings while retaining the managed snapshot and effective fleet values.

The Fleet SNMP section exposes protocol version (1, 2c, or 3), community, timeout, retries, and all SNMPv3 security fields. Password controls are masked, not redacted from authenticated settings responses. Effective SNMP settings apply to new queries without restarting the Agent. Local-printer settings reload from persistent storage and fleet changes restart the spooler worker.

Both UIs use discovery concurrency 1–200, SNMP timeout 500–60000 ms, retries 0–5, metrics intervals 1–1440 minutes (or a 15–300 second override; 0 uses minutes), and spooler intervals 5–300 seconds. A seconds override takes precedence until explicitly cleared; zero retries is preserved.

### Selecting Stable, Beta, or Dev Agent builds

In **Settings → Fleet → Agent Updates**, **Agent Update Channel** offers:

- **Stable**: stable releases.
- **Beta**: beta releases.
- **Dev**: development releases.
- **Use Agent configuration**: retain the Agent's configured/build-derived channel.

Choose **Global Defaults** for the fleet-wide channel, **Customer/Tenant** to override that default, or **Agent** to override the customer's effective channel. Overrides display an **Override** badge; **Inherit** removes the override and restores the parent scope's channel. **Use Agent configuration** is an explicit empty channel value, not an inheritance reset.

Save with the main **Save Changes** action. This remains the existing `features.agent_update_channel` field, so **Features must be centrally managed**; customer enforcement of Features locks Agent channel overrides. Agent Updates combines the channel selector with automatic-update scheduling, version pins, and maintenance windows. Scheduling/rollout policies remain global/customer scoped; the Agent scope exposes its channel override and explains where to configure scheduling. Selecting a channel does not itself trigger an installation or enable a disabled Agent updater.

The three release channels are **Stable**, **Beta**, and **Dev**. Beta is available as a selection ahead of its first release cycle; selecting it does not create a beta artifact or fall back to another channel when none is cached.

Before selecting Beta or Dev, enable Server prerelease intake, restart the Server if its intake configuration changed, and sync releases so matching platform artifacts are cached. Older Agents can use **Update Agent → Force install Fleet channel** to bootstrap from the saved channel, but their legacy forced updater may bypass version pins or downgrade. Updated Agents enforce pins and no-downgrade policy even for Force; only maintenance timing is bypassed. Explicit one-shot Stable/Beta/Dev commands require an Agent that supports them. See [Agent update behavior](/api/protocol/#explicit-channel-update-command).

### Configuration File Location

| Platform | Agent Path | Server Path |
|----------|------------|-------------|
| Windows | `C:\ProgramData\PrintMaster\agent\config.toml` | `C:\ProgramData\PrintMaster\server\config.toml` |
| Linux | `/etc/printmaster/agent/config.toml` | `/etc/printmaster/server/config.toml` |
| macOS | `/Library/Application Support/PrintMaster/agent/config.toml` | `/Library/Application Support/PrintMaster/server/config.toml` |
| Docker | `/var/lib/printmaster/agent/config.toml` | `/var/lib/printmaster/server/config.toml` |

Or place `config.toml` in the same directory as the binary.

---

## Agent Configuration

### Complete Example

```toml
# PrintMaster Agent Configuration

# Asset ID regex pattern for extracting asset tags from device data
asset_id_regex = "\\b\\d{5}\\b"

# Number of concurrent SNMP queries (adjust based on network capacity)
discovery_concurrency = 50

# Enable Epson remote-mode commands (experimental)
epson_remote_mode_enabled = false

[snmp]
  # Default SNMP community string
  community = "public"
  
  # SNMP timeout in milliseconds
  timeout_ms = 2000
  
  # Number of retries for failed SNMP queries
  retries = 1

[web]
  # HTTP port for web UI
  http_port = 8080
  
  # HTTPS port (if TLS enabled)
  https_port = 8443
  
  # Enable TLS/HTTPS
  enable_tls = false
  
  # Runtime HTTPS/custom certificates are managed in the agent UI.
  # cert_file/key_file are not supported AgentConfig TOML fields.

[web.auth]
  # Authentication mode: local, server, disabled
  mode = "local"
  
  # Allow loopback admin bypass; remote requests are not automatically admins
  allow_local_admin = true

[server]
  # Enable server upload mode
  enabled = false
  
  # PrintMaster Server URL
  url = "https://printmaster-server:9443"
  
  # Friendly name for this agent
  name = "Main Office"
  
  # Path to server CA certificate (for self-signed certs)
  ca_path = ""
  
  # How often to upload discovery data (seconds)
  upload_interval_seconds = 300
  
  # How often to send heartbeat (seconds)
  heartbeat_interval_seconds = 60
  
  # Agent token persisted after onboarding; not a user login password
  token = ""

[database]
  # SQLite database path (blank = default location)
  path = ""

[logging]
  # Log level: debug, info, warn, error
  level = "info"

[auto_update]
  # Update mode: inherit, local, disabled
  mode = "inherit"

  [auto_update.local_policy]
    # Days between update checks
    update_check_days = 7
    
    # Version pin strategy: minor, major
    version_pin_strategy = "minor"
    
    # Allow major version upgrades
    allow_major_upgrade = false
    
    # Pin to specific version (blank = latest)
    target_version = ""
    
    # Send telemetry data
    collect_telemetry = true

    [auto_update.local_policy.maintenance_window]
      enabled = false
      timezone = "UTC"
      start_hour = 2
      start_min = 0
      end_hour = 5
      end_min = 0
      days_of_week = ["Sunday"]

    [auto_update.local_policy.rollout_control]
      staggered = true
      jitter_seconds = 300
```

### SNMP Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `community` | `public` | SNMP v1/v2c community string |
| `timeout_ms` | `2000` | Query timeout in milliseconds |
| `retries` | `1` | Retry attempts for failed queries |

**Tip**: If you use a different community string, set it here to avoid manual configuration for each scan.

### Web UI Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `http_port` | `8080` | HTTP port for web interface |
| `https_port` | `8443` | Startup HTTPS port |
| `enable_tls` | `false` | Legacy TOML field; runtime listener settings come from unified/UI settings |

The runtime defaults enable HTTP on `8080` and HTTPS on `8443`, with an auto-generated certificate when available. Configure `enable_http`, `enable_https`, `custom_cert_path`, and `custom_key_path` through the agent's unified web settings/UI, not unsupported `cert_file`/`key_file` TOML keys.

With `mode = "local"` and `allow_local_admin = true`, protected routes permit loopback admin bypass, not unrestricted remote access. `disabled` removes authentication and is unsafe on untrusted networks. Loopback is determined from the TCP peer address only. Spoofed `X-Forwarded-For`/`X-Real-IP` headers cannot grant local admin. A same-host reverse proxy forwarding for a remote client is not treated as local. Note that a local proxy that strips forwarding headers makes every proxied request look local, so disable `allow_local_admin` behind such a proxy.

### Server Connection Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `false` | Enable server upload mode |
| `url` | - | Server URL (default standalone listener: `https://server:9443`; proxy HTTP backend: `http://server:9090`) |
| `name` | hostname at runtime | Friendly name for this agent |
| `upload_interval_seconds` | `300` | Full sync interval |
| `heartbeat_interval_seconds` | `60` | Status ping interval |
| `token` | - | Authentication token |
| `ca_path` | - | CA cert for self-signed server certs |

### Auto-Update Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `mode` | `inherit` | `inherit`, `local`, or `disabled` |
| `update_check_days` | `7` | Days between checks |
| `version_pin_strategy` | `minor` | `minor` or `major` |
| `allow_major_upgrade` | `false` | Allow major version jumps |

---

## Server Configuration

### Complete Example

```toml
# PrintMaster Server Configuration

[server]
  # HTTP backend port, used only in HTTP reverse-proxy mode
  http_port = 9090
  
  # HTTPS port
  https_port = 9443
  
  # Default: standalone HTTPS only
  behind_proxy = false
  proxy_use_https = false
  self_update_enabled = true
  
  # Bind address
  bind_address = "0.0.0.0"

[tls]
  # Supported modes: self-signed, letsencrypt, custom
  mode = "self-signed"
  domain = "localhost"
  # For mode = "custom":
  # cert_path = "/path/to/cert.pem"
  # key_path = "/path/to/key.pem"

[database]
  # Implemented server backends: sqlite, postgres
  driver = "sqlite"
  
  # SQLite path (if driver = sqlite)
  path = "/var/lib/printmaster/server/printmaster.db"
  
  # PostgreSQL connection string (if driver = postgres)
  # dsn = "postgres://user:pass@host:5432/printmaster?sslmode=require"

[logging]
  # Log level: debug, info, warn, error
  level = "info"

[self_update]
  # Enablement belongs to [server].self_update_enabled
  # Release channel
  channel = "stable"
  
  # Check interval in minutes
  check_interval_minutes = 360

[releases]
  # Unreleased: read-only public TUF metadata mirror, never signing secrets.
  # Empty disables metadata delivery (Agents fail closed).
  publisher_metadata_dir = ""
  # Max releases to cache
  max_releases = 6
  
  # Poll interval for new releases
  poll_interval_minutes = 240
```

The unreleased `releases.publisher_metadata_dir` setting can also be supplied as
`RELEASES_PUBLISHER_METADATA_DIR`. Restart the Server after changing it. It must
point at a public metadata-only mirror, preferably mounted read-only; it must
not point at the publisher's private key directory or signing workspace.
This configures delivery, not trust or signing activation. Current source
builds intentionally have an unprovisioned embedded publisher root and cannot
perform unattended updates until owner setup and remaining release gates are
complete. See [publisher metadata delivery](/api/protocol/#publisher-metadata-delivery-unreleased)
and the [update release plan](/development/auto-update-plan/).

### Database Settings

**SQLite (Default)**:
```toml
[database]
driver = "sqlite"
path = "/var/lib/printmaster/server/printmaster.db"
```

**PostgreSQL**:
```toml
[database]
driver = "postgres"
dsn = "postgres://printmaster:password@localhost:5432/printmaster?sslmode=require"
```

### Authentication Settings

There is no server `[auth]` TOML section for `session_timeout_hours` or `allow_registration`. Manage users through the authenticated server UI.

On every startup, `ADMIN_USER` (default `admin`) and `ADMIN_PASSWORD` (default `printmaster`) create an admin only if that username is absent. They do **not** reset an existing user's password or role. Set a strong bootstrap password before exposing the server; change existing passwords through user management.

---

## Environment Variables

Both agent and server support environment variable configuration. Variables override config file values.

### Common Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Log level: debug, info, warn, error | `info` |
| `CONFIG` | Path to config file | — |
| `DB_PATH` | Database path | Component default |
| `PM_DISABLE_SELFUPDATE` | Disable auto-updates | `false` |

### Agent Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AGENT_CONFIG` | Path to config file | — |
| `AGENT_DB_PATH` | Agent database path | — |
| `WEB_HTTP_PORT` | HTTP port | `8080` |
| `WEB_HTTPS_PORT` | HTTPS port | `8443` |
| `WEB_AUTH_MODE` | Auth mode: local, server, disabled | `local` |
| `WEB_ALLOW_LOCAL_ADMIN` | Allow localhost admin | `true` |
| `SNMP_COMMUNITY` | SNMP community string | `public` |
| `SNMP_TIMEOUT_MS` | SNMP timeout (ms) | `2000` |
| `SNMP_RETRIES` | SNMP retry count | `1` |
| `DISCOVERY_CONCURRENCY` | Concurrent scans | `50` |
| `SERVER_ENABLED` | Enable server mode | `false` |
| `SERVER_URL` | Central server URL | — |
| `AGENT_NAME` | Display name | Hostname |

### Server Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVER_CONFIG` | Path to config file | — |
| `SERVER_DB_PATH` | Server database path | — |
| `SERVER_HTTP_PORT` | HTTP port | `9090` |
| `SERVER_HTTPS_PORT` | HTTPS port | `9443` |
| `BIND_ADDRESS` | Bind address | `0.0.0.0` |
| `BEHIND_PROXY` | Behind reverse proxy | `false` |
| `PROXY_USE_HTTPS` | HTTPS backend when behind proxy; `false` selects HTTP backend | `false` |
| `TRUSTED_PROXIES` | Trusted proxy CIDRs | Private ranges |
| `ADMIN_USER` | Initial admin username | `admin` |
| `ADMIN_PASSWORD` | Initial admin password | `printmaster` |
| `AUTO_APPROVE_AGENTS` | Auto-approve agents | `false` |
| `AGENT_TIMEOUT_MINUTES` | Agent offline timeout | `15` |
| `SERVER_DB_DRIVER` / `DB_DRIVER` | Server backend: `sqlite`, `postgres` | `sqlite` |
| `SERVER_DB_DSN` / `DB_DSN` | Full connection string; overrides individual DB connection fields | — |

### TLS Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TLS_MODE` | `self-signed`, `letsencrypt`, `custom` (server) | `self-signed` |
| `TLS_CERT_PATH` | Certificate path (`custom`) | — |
| `TLS_KEY_PATH` | Key path (`custom`) | — |
| `LETSENCRYPT_DOMAIN` | Let's Encrypt domain | — |
| `LETSENCRYPT_EMAIL` | Let's Encrypt email | — |
| `LETSENCRYPT_ACCEPT_TOS` | Accept ToS | `false` |

Standalone mode serves HTTPS on `9443`, not HTTP on `9090`. For a proxy terminating TLS with an HTTP upstream, set both `BEHIND_PROXY=true` and `PROXY_USE_HTTPS=false`, then forward to `http://server:9090`. Setting `PROXY_USE_HTTPS=true` selects an HTTPS backend on `9443`. `none`, `disabled`, `acme`, and `manual` are not supported TLS modes. Let's Encrypt additionally requires a reachable domain and public HTTP challenge access on port `80`.

### SMTP Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SMTP_ENABLED` | Enable email | `false` |
| `SMTP_HOST` | SMTP server | — |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASS` | SMTP password | — |
| `SMTP_FROM` | Sender address | — |

### Docker Example

```yaml
environment:
  - ADMIN_PASSWORD=secure-password
  - BIND_ADDRESS=0.0.0.0
  - LOG_LEVEL=info
  - BEHIND_PROXY=true
  - PROXY_USE_HTTPS=false
  - PM_DISABLE_SELFUPDATE=true
```

### systemd Service Example

```ini
[Service]
Environment=SERVER_ENABLED=true
Environment=SERVER_URL=https://printmaster.example.com:9443
Environment=AGENT_NAME=office-hq
Environment=LOG_LEVEL=info
```

---

## Command Line Options

### Agent

```bash
printmaster-agent [options]

Options:
  -config string
        Path to configuration file
    -generate-config
      Generate default TOML and exit
  -service string
        Service command: install, uninstall, start, stop, run
  -quiet
        Suppress informational output
    -silent
      Suppress all output
    -health
      Probe local health endpoint and exit
  -help
        Show help
  -version
        Show version
```

### Server

```bash
printmaster-server [options]

Options:
  -config string
        Path to configuration file
    -generate-config
      Generate default TOML and exit
    -service string
      Service command: install, uninstall, start, stop, restart, run
    -quiet
      Suppress informational output
    -silent
      Suppress all output
    -health
      Probe local health endpoint and exit
  -help
        Show help
  -version
        Show version
```

---

## Configuration via Web UI

Most settings can be changed through the web interface:

### Agent UI

- **Settings** → **Discovery**: SNMP settings, concurrency
- **Settings** → **Server**: Server connection settings
- **Settings** → **Updates**: Auto-update preferences
- **Devices** → **IP Ranges**: Networks to scan

### Server UI

- **Admin** → **Users**: Local accounts and invitations
- **Admin** → **Access**: OIDC providers, role reference, and active sessions
- **Admin** → **Tenants**: Tenant accounts and assignments
- **Admin** → **Fleet**: Managed discovery settings, overrides, and agent update policy
- **Admin** → **Server**: Instance settings, grouped by category: Network & Proxy, Authentication & Rate Limits, TLS & Certificates, Logging Level, Release Intake, Server Self-Update, SMTP Notifications, and Administrator Notifications
- **Admin** → **Alert Setup**: Alert rules, channels, escalation, and notification behavior
- **Admin** → **Audit**: Administrative activity records

### Agent update channels

Persistent Fleet channel selection and stable 0.31.1 bootstrap were reviewed at [source commit 589e269](https://github.com/Printmaster-Org/printmaster/commit/589e269fb1cd18a48383cd6e757bc32bdab4159b). Common/Agent/Server Go suites, focused race tests, 47 JS unit tests and 84 browser tests passed (six mobile context-menu tests intentionally skipped). Authenticated old-style manifest request fixtures verify dev selection, tenant beta override, empty/unmanaged fallback, explicit selection precedence, foreign-ID denial and settings-resolution failure. This is fixture/source validation, not certification of a deployed 0.31.1 installation on every platform.

Implemented/reviewed at [source commit 685f0fe](https://github.com/Printmaster-Org/printmaster/commit/685f0feccd16b02916cb814f6cdea6d91693738c): Server update modal/command authorization, release intake/manifest selection, prerelease Server setting, single Fleet policy editor, and Agent operation-scoped channel installation. This is not a released/deployed binary claim.

Fleet has **one scope-aware Agent Updates section**: channel selection at global, tenant, and Agent scope, with automatic-update policy editing at global/tenant scope. Its channel, cadence, pinning, maintenance window and rollout controls share the main **Save Changes** action. The separate **Agent Release Cache** panel only displays/syncs cached artifacts; it is not another policy editor. This removes the older reduced editor whose saves replaced maintenance/rollout values with defaults. No stored policies are reset by this cleanup.

Set a **persistent** default under **Admin → Fleet → Global Defaults → Agent Updates → Agent Update Channel**, then **Save Changes**. Choices are **Use Agent configuration** (empty, default), **Stable**, **Beta**, and **Dev**. This JSON-managed setting is `features.agent_update_channel`; Features must be managed. Tenant overrides inherit the global channel; permitted per-Agent overrides inherit the tenant's effective channel. Customer enforcement of Features prevents per-Agent overrides. **Inherit** removes an override, while an empty channel preserves the Agent's existing `[auto_update].channel` or build-derived default. The selector shares the Agent Updates section with cadence/version-pin policy but does not change policy storage or require a database schema migration.

For a manual channel install, right-click a connected Agent and choose **Update Agent**. The confirmation offers **Configured channel (respect update policy)**, **Force install Fleet channel (supports older Agents)**, **Stable**, **Beta**, and **Dev**. The configured option retains `check_update`, including normal policy/version restrictions. The Fleet-force choice sends the existing `force_update` command using the saved Fleet channel (or Agent config when empty). Explicit Stable/Beta/Dev remains a **one-shot forced install** via `install_channel`; it does not change the persistent default.

**Unreleased hardened Agent policy:** Force and explicit channel installs bypass maintenance timing, not version pins, major-upgrade restrictions, publisher trust or no-downgrade policy. An exact same-version reinstall is allowed; binary bytes must match the installed artifact, and MSI reinstall needs an authenticated installation receipt. Unknown versions/invalid pins fail explicitly. A switch from Beta/Dev to older Stable is blocked: wait for a sufficiently new release or use an owner-managed installation. Failed synchronous apply may still restore its recorded, hash-verified previous backup; that is not arbitrary downgrade approval or a health-gated recovery guarantee. Same-line Dev updates need publisher-signed release ordering for both installed and candidate builds; a legacy unorderable baseline needs owner-managed migration. Managed channel changes apply to the next operation. See [application policy](/development/auto-update-plan/#application-policy-and-installation-descriptors-unreleased). Older Agents retain their weaker forced-update behavior and may bypass pins or downgrade. Default hardened builds remain update-blocked until production trust is provisioned.

**Prerelease prerequisite:** in **Admin → Server → Release Intake**, set **Include Beta / Dev Releases** to **Enabled**, save, restart the Server, then use **Sync from GitHub** in Agent Release Cache. Automatic follows the Server build type; Stable builds normally exclude prereleases, Beta and Dev builds include them. Environment-set `releases.include_prerelease` remains locked. Intake classifies `-dev`/`-dev.*` as `dev`, other prerelease versions (including beta/rc/alpha) as `beta`, and versions without prerelease identifiers as `stable`. Existing cached beta artifacts/manifests incorrectly marked stable are repaired/re-signed when synced; stale mislabeled prerelease manifests are rejected for stable selection. A channel with no cached artifact cannot install.

**Bootstrap a stable 0.31.1 Agent:** update the Server, enable prerelease intake/restart/sync as below, save `dev` as the Fleet Agent Update Channel, then choose **Force install Fleet channel**. Old Agents already support `force_update` and their ordinary stable manifest requests are resolved to the saved channel on the updated Server. No new Agent command or local TOML edit is required for this path. Their status may still display the local requested `stable` channel; inspect the returned target version/progress. Updated Agents show/check their managed channel dynamically as snapshots arrive, without restarting solely for a channel change. The Agent-side existing **Update Now** forced action can also use the saved Server-selected channel.

**Compatibility:** explicit one-shot Stable/Beta/Dev selection still uses `install_channel`; older Agents ignore that new command. Use the Fleet-force bootstrap path instead, or manually install if the old updater is unavailable. Ordinary update checks still obey version pins and semantic ordering, so a same-base prerelease may be skipped; force installation is intentional for bootstrap. Server acknowledgment means dispatched, not installed. Docker Agents still require container-image updates. MSI-installed Agents update with the cached MSI for their channel. Agents older than [bb99bbe](https://github.com/Printmaster-Org/printmaster/commit/bb99bbe850ce2921f4e730b1751d92ec1d1bb361) cannot request it, so reinstall those once with the current MSI. **Install-method channel limits (Agents from [73197f9](https://github.com/Printmaster-Org/printmaster/commit/73197f94515e75003f8103372d3de6aa78b1bc9c)):** Beta and Dev publish only raw binaries and Docker images. The APT/DNF repositories carry Stable packages, and MSIs are built for Stable tags only. MSI-installed and package-managed Agents therefore always follow **Stable**, even when Fleet selects Beta or Dev. Their scheduled checks request Stable explicitly, and the Agent's update status explains the constraint. An explicit Beta/Dev **Update Agent** choice on those Agents is refused with `CHANNEL_UNSUPPORTED` telemetry instead of installing something else. To test Beta on such a host, reinstall it with the raw binary or use the Docker image. Package-managed updates install the exact manifest version. If the repository lacks it, the update fails visibly; there is no versionless `dnf`/`yum upgrade` fallback. Beta/dev builds should be validated on a small test fleet first; see the [Beta program](/guides/beta-program/) for the tester checklist and known limitations.

These command/configuration writes remain outside the reviewed read-only OpenAPI subsets. User-session Agent commands retain role/tenant authorization; machine manifests/downloads use Agent credentials. `install_channel` adds a command name, not an HTTP route or a breaking machine-message envelope change; existing commands remain supported. No product, contract or protocol version is bumped solely for this additive capability.

### Update lifecycle recovery (unreleased)

Implemented at [source commit 946bf99](https://github.com/Printmaster-Org/printmaster/commit/946bf990e668d1053b71fa5eb6c1873980b37ef7).
Agent/client, Server/storage and shared-policy Go tests, 51 focused UI unit
tests, and desktop/small-desktop/mobile Chromium lifecycle tests passed.
PostgreSQL integration tests compile but were not executed against a running
database. This is source/fixture validation, not certification of a deployed
update on every supported installer and service platform.

Updated Agents keep a durable operation journal under the Agent data directory
at `autoupdate/progress.json`. Update checks and installs have a run ID and
ordered progress events. Failed, cancelled and completed operations do not
prevent another manual or scheduled operation; overlapping operations are still
rejected.

The Server retains the last ordered snapshot per Agent in its database. Agents
replay their snapshot during heartbeats, including over HTTP when WebSocket
delivery was missed. Reloading the Fleet page or reconnecting its event stream
restores the recorded status. Old events cannot move a completed run back into
installation, and completion from an earlier run cannot clear a newer one.
Percentages from updated Agents are not rescaled or advanced by a browser timer.

An install remains **Restarting** until the restarted Agent validates that its
running version matches the intended target. A WebSocket reconnect or a changed
version observed by the browser is not sufficient to declare success. This
also allows an intentional same-version reinstall to complete correctly.
If validation has not arrived after the UI waiting period, the run stays
unresolved instead of being cleared or labelled successful.

Before handing off installation, the Agent must persist its pending target and
run identity. A journal-write failure prevents the initial handoff. After an
unexpected Agent restart, an unfinished operation without a pending install is
reported as interrupted and can be retried. Malformed journals are preserved
with a `.corrupt-<timestamp>` suffix and reported as failures rather than
permanently disabling the updater.

These changes require updated Agent and Server binaries. Older Agents retain
best-effort legacy progress. This phase validates the running version; it does
**not** add an independent health watchdog, automatic recovery from a binary
that cannot start, installer deadlines, artifact-cache repair, stronger
download/resume handling or enforced publisher signatures. Those are separate
hardening work. "Check for Updates" still uses its existing release-cache and
policy behavior; tracked upstream checks are not part of this phase.

UI persistence and activation depend on the setting. Some changes require restart; server environment-set keys cannot be overridden by managed settings.

---

## Configuration Precedence

Use supported TOML keys or environment variables for startup ports, database paths, and logging. Neither binary accepts `-port`, `-data-dir`, or `-log-level`.

**Example**: Set `SERVER_HTTPS_PORT=9444` to override `[server].https_port` from TOML. See [Configuration Methods](#configuration-methods) for managed-setting caveats. Use `-help` on the installed binary to confirm its version-specific flags.
