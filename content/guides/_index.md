---
title: "PrintMaster Documentation"
description: "Installation, configuration, features, and troubleshooting for your fleet."
weight: 10
icon: "▤"
source: "docs/README.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

Cross-platform printer/copier fleet management for MSPs, MPS providers, and IT departments.

---

## Quick Start

| Document | Description |
|----------|-------------|
| [Installation Guide](/guides/install/) | Install on Windows, Linux, macOS, Docker |
| [Getting Started](/guides/getting-started/) | First steps after installation |

---

## User Guides

| Document | Description |
|----------|-------------|
| [Features Guide](/guides/features/) | All features explained with examples |
| [Configuration](/guides/configuration/) | Config files, environment variables, UI settings |
| [Troubleshooting](/guides/troubleshooting/) | Common issues and solutions |
| [FAQ](/guides/faq/) | Frequently asked questions |

---

## Deployment

| Document | Description |
|----------|-------------|
| [Docker Deployment](/deployment/docker/) | Docker and Docker Compose setup |
| [Database Upgrade](/deployment/database-upgrade/) | PostgreSQL and TimescaleDB upgrade procedure |
| [Unraid Deployment](/deployment/unraid/) | Unraid-specific installation |

---

## API Reference

| Document | Description |
|----------|-------------|
| [API Reference](/api/) | REST API for agent and server |

---

## What is PrintMaster?

PrintMaster consists of two components:

### Agent
A lightweight service that runs at each site:
- Discovers printers on your network via SNMP
- Collects page counts, toner levels, device info
- Local web UI for management
- Can run standalone or report to server

### Server  
Central hub for managing multiple agents:
- Aggregates data from all agents
- Fleet view dashboard
- Remote agent access via WebSocket proxy
- Multi-tenant support

### Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Agent     │────────▶│   Server    │◀────────│   Agent     │
│   Site A    │         │  (Central)  │         │   Site B    │
└─────────────┘         └─────────────┘         └─────────────┘
      ↓                       ↓                       ↓
  Printers              Web Dashboard            Printers
```

---

## Getting Help

- [GitHub Issues](https://github.com/printmaster-org/printmaster/issues) — Bug reports
- [GitHub Discussions](https://github.com/printmaster-org/printmaster/discussions) — Questions and ideas

---

## For Developers

See [Developer Documentation](/development/) for:
- Build instructions and project structure
- Internal architecture and design
- Contributing guidelines

