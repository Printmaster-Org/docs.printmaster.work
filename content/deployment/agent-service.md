---
title: "Run the Agent as a service"
description: "Install, start, update, and troubleshoot the PrintMaster Agent service."
weight: 30
aliases: ["/components/agent/service/"]
source: "agent/SERVICE.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

The Agent can run in the background and start with the operating system. Run service-management commands from an elevated terminal: Administrator on Windows, or root via `sudo` on Linux and macOS.

## Install and start

Use the Agent executable from the release or package you installed. From its directory:

```powershell
./printmaster-agent.exe --service install
./printmaster-agent.exe --service start
```

On Linux or macOS:

```sh
sudo ./printmaster-agent --service install
sudo ./printmaster-agent --service start
```

The service manager controls startup and restarts. The service runs with the operating-system identity configured by the installer or service manager; do not assume it uses a dedicated account. Keep its data and configuration directories accessible only to the service identity and administrators.

## Check and manage the service

On Windows, use PowerShell:

```powershell
Get-Service PrintMasterAgent
./printmaster-agent.exe --service stop
./printmaster-agent.exe --service start
```

On Linux:

```sh
sudo systemctl status PrintMasterAgent
sudo journalctl -u PrintMasterAgent -n 100 --no-pager
```

On macOS, check the service and recent process logs with the system's `launchctl` and Console tools. The Agent data directory is `/Library/Application Support/PrintMaster/`.

To remove a service, stop it first, then run `--service uninstall` from the matching installed Agent executable. Do not delete its data directory unless you intend to remove the local Agent identity, settings, and database as well.

## Updating an existing Windows service

Raw-binary services installed from another path may need to be migrated to the protected Program Files location before automatic updates can replace the executable. Run `--service update` as Administrator from the supported raw-binary installation. Do not manually copy over an executable while its service is running. MSI installations use their normal Windows Installer upgrade path; do not mix raw-binary service updates with MSI ownership.

## Data and logs

Common service data locations are:

| Platform | Data location |
| --- | --- |
| Windows | `C:\ProgramData\PrintMaster\agent\` |
| Linux | `/var/lib/printmaster/` |
| macOS | `/Library/Application Support/PrintMaster/` |

For logs, check the Agent data directory, the operating-system service journal, or the Windows Event Viewer, depending on how the service was installed. See [troubleshooting](/guides/troubleshooting/) for connection and UI issues.