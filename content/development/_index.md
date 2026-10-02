---
title: "PrintMaster Developer Documentation"
description: "Build, test, and extend PrintMaster with architecture and vendor references."
weight: 40
icon: "⌘"
source: "docs/dev/README.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

Technical documentation for PrintMaster development. For user documentation, see [/docs](/guides/).

**Current Version**: Agent v0.23.6, Server v0.23.6

---

## Start Here
- [TODO.md](/development/todo/) – **Consolidated pending features and improvements**
- [PROJECT_STRUCTURE.md](/development/project-structure/) – Repository layout and module overview
- [BUILD_WORKFLOW.md](/development/build-workflow/) – Build/test/release commands + VS Code tasks

## User Documentation (Moved)
These docs are now in the parent [/docs](/guides/) folder:
- [API Reference](/api/) – REST API for agent and server
- [Configuration](/guides/configuration/) – Config files and environment variables
- [Docker Deployment](/deployment/docker/) – Container deployment
- [Unraid Deployment](/deployment/unraid/) – Unraid-specific setup

## Architecture & Internals
- [SECURITY_ARCHITECTURE.md](/development/security-architecture/) – Authentication/authorization design
- [WEBSOCKET_PROXY.md](/development/websocket-proxy/) – Server proxy tunnel details
- [SNMP_REFERENCE.md](/development/snmp-reference/) – OIDs, vendor detection, discovery process
- [SNMP_RESEARCH_NOTES.md](/development/snmp-research-notes/) – Protocol research and notes
- [Printer-MIB.mib](/media/docs/dev/Printer-MIB.mib) – Standard Printer-MIB file
- [RANGE_SYNTAX.md](/development/range-syntax/) – IP range syntax documentation
- [USB_IMPLEMENTATION.md](/development/usb-implementation/) – USB printer support via IPP-USB proxy (Windows only)

## Development & Testing
- [TESTING.md](/development/testing-ci/) – Testing strategy and patterns
- [TEST_COVERAGE_ANALYSIS.md](/development/test-coverage-analysis/) – Coverage status and gaps

## Feature Plans (In Progress)
- [AUTO_UPDATE_PLAN.md](/development/auto-update-plan/) – Agent/server auto-update implementation
- [EPSON_REMOTE_MODE_PLAN.md](/development/epson-remote-mode-plan/) – Epson remote-mode integration

## Reference
- [DEPRECATIONS.md](/development/deprecations/) – Removed features and migration notes
- [vendor/](/development/vendor/) – Vendor-specific OID documentation

---

> For condensed AI/assistant guidance, see `.github/copilot-instructions.md`

