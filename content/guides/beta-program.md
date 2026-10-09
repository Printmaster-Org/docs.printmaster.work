---
title: Beta program
description: How to join the PrintMaster Beta, what to test, known limitations, and how to return to Stable.
weight: 40
---

PrintMaster publishes three release channels:

| Channel | Audience | Artifacts |
|---------|----------|-----------|
| **Stable** | Production fleets | Agent binaries, Windows MSI, DEB/RPM packages with APT/DNF repositories, Agent and Server Docker images (`latest`) |
| **Beta** | Small test fleets before a Stable release | Agent binaries (Windows `.exe`), versioned DEB/RPM release assets (no repositories), Agent and Server Docker images (`beta` and the exact version tag) |
| **Dev** | Developers only | Agent binaries, Agent and Server Docker images (`main` and `dev-<short-sha>`); not intended for general use |

Each Stable minor release first goes through one or more Beta builds, for example `0.32.0-beta.1`, then `0.32.0-beta.2`, then `0.32.0`. Beta builds are feature-complete candidates. They can still contain bugs, so run them only on fleets where an interruption is acceptable.

## Joining the Beta

1. **Back up the Server database.** Beta Servers may apply schema migrations. Rolling a Server back to Stable after a migration is not tested; restore the backup instead. See [Database upgrade](/deployment/database-upgrade/).
2. **Run a Beta Server.** Pin the exact version, for example `ghcr.io/printmaster-org/printmaster-server:0.32.0-beta.1`, or follow the moving `beta` tag. Beta never moves the Stable `latest` tag. See [Docker deployment](/deployment/docker/).
3. **Enable prerelease intake.** In **Admin → Server → Release Intake**, set **Include Beta / Dev Releases** to **Enabled**, save, and restart the Server. Then use **Sync from GitHub** in the Agent Release Cache so Beta Agent artifacts are cached. A channel with no cached artifact cannot install.
4. **Select Beta for a test group.** In **Admin → Fleet → Agent Updates → Agent Update Channel**, choose **Beta** at the scope you want to test: global, customer, or a single Agent. Start with one Agent or one customer. Selecting a channel does not install anything by itself. Agents pick it up on their next scheduled check, or you can use **Update Agent → Force install Fleet channel**. See [Agent update channel](/guides/configuration/).
5. **Check the install method.** Only raw-binary and Docker Agents can follow Beta. MSI-installed and APT/DNF-managed Agents always stay on **Stable**, because Beta publishes no MSI or repository packages. Their update status explains this, and an explicit Beta install is refused with `CHANNEL_UNSUPPORTED`. To test Beta on such a host, reinstall it with the raw binary (`.exe` on Windows) or use Docker. A Beta DEB/RPM installed by hand runs the Beta, but that Agent counts as package-managed and receives only Stable updates afterward.

## Tester checklist

Work through this list on each Beta and report anything unexpected:

- [ ] **Upgrade path:** a Stable Agent moves to Beta, and a later Beta (for example `beta.1` to `beta.2`) installs automatically on its schedule.
- [ ] **Agent status:** the Agent shows channel **Beta** and the expected target version. MSI and package installs show the Stable-only note instead.
- [ ] **Server upgrade:** the Server starts on the Beta image, migrations complete, and existing Agents reconnect without re-registering.
- [ ] **Inventory:** discovered and saved devices keep their state, and saving a device that is already saved behaves correctly.
- [ ] **Consumables:** ink devices show ink names, toner devices show toner names, and vendor-specific names appear where supported.
- [ ] **Metrics dashboard:** the tenant, Agent, and device filters narrow totals and history to the selected scope.
- [ ] **Fleet Settings:** global, customer, and Agent overrides inherit and override as expected, including the Agent Update Channel.
- [ ] **Soak:** leave the Beta running for several days and check for memory growth, missed scans, disconnects, or log errors.
- [ ] **Return to Stable:** after the matching Stable release, Beta Agents upgrade to it automatically, as described below.

## Returning to Stable

Set **Agent Update Channel** back to **Stable** (or **Inherit**) at the same scope.

Scheduled update checks only move forward. A Beta Agent therefore **stays on its Beta build** until a newer Stable version is published. Because `0.32.0` sorts after `0.32.0-beta.N`, the Agent then upgrades automatically. To leave the Beta immediately, choose **Update Agent → Stable** for that Agent. An explicit channel install reinstalls the latest cached Stable release even when it is older.

For the Server, switch the image back to a Stable tag. If the Beta applied schema migrations, restore the database backup taken before joining.

## Known limitations

These are known gaps in the current Beta. They are tracked for future releases and are not regressions.

- **Scheduled report delivery:** scheduled reports run and their results are stored, but email and webhook delivery is not implemented yet. Recipient and webhook fields are saved but nothing is sent.
- **Update integrity:** Agents verify each download against the SHA-256 hash in the Server's update manifest. The manifest is fetched over the authenticated Agent connection. Agents do not yet verify a manifest signature independently.
- **Installer channels:** MSI and APT/DNF installs always follow Stable, as described above. MSI Agents older than [bb99bbe](https://github.com/Printmaster-Org/printmaster/commit/bb99bbe850ce2921f4e730b1751d92ec1d1bb361) cannot request the MSI update format and need one manual reinstall with the current MSI.
- **Docker Agents** update by pulling a new image, not through the in-app updater.
- **Supply names:** models without a vendor-specific mapping show generic, ink- or toner-aware color names. Supply part numbers and links to official vendor product pages are not shown yet.

## Reporting issues

Open a [GitHub issue](https://github.com/printmaster-org/printmaster/issues). Include:

- the Agent and Server versions and channels
- the Agent install method (binary, MSI, APT/DNF, or Docker)
- the steps to reproduce
- relevant log excerpts

Diagnostics exports can contain hostnames, IP addresses, serial numbers, and credentials metadata, so review and redact them before attaching.
