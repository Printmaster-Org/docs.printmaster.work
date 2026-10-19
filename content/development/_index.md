---
title: "Developer docs"
description: "Build, test, and extend PrintMaster. Browse internals, research, and project resources separately from user guides."
weight: 70
source: "docs/dev/README.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
groups:
  - title: "Build & test"
    pages: ["/development/project-structure", "/development/build-workflow", "/development/update-signing-operations", "/development/testing-ci", "/development/testing", "/development/test-coverage-analysis"]
  - title: "Architecture & implementation"
    pages: ["/components", "/development/shared-progressive-loading", "/development/websocket-proxy", "/development/range-syntax", "/development/usb-implementation", "/development/cloudflare-proxy-worker"]
  - title: "Protocols & vendor research"
    pages: ["/development/snmp-reference", "/development/snmp-research-notes", "/development/vendor"]
  - title: "Roadmaps & historical notes"
    pages: ["/development/public-api-roadmap", "/development/deprecations", "/development/auto-update-plan", "/development/epson-remote-mode-plan", "/development/security-architecture", "/development/git-integration-summary", "/development/todo"]
  - title: "Project & contributing"
    pages: ["/project"]
---

This section is for people developing PrintMaster, not for configuring a copier. For device setup instructions, use the [brand knowledge base](/printers/). For running the application, use [PrintMaster guides](/guides/) and [deployment](/deployment/).

**Implementation reference and research are not setup recipes.** Vendor investigations describe evidence and limitations; historical plans may not describe shipped behavior.

Start with the build and test documentation, then follow the relevant architecture or protocol reference. The [API reference](/api/) is the separate entry point for integrations.
