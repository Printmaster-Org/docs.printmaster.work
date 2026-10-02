---
title: Server OpenAPI Reference
description: Machine-readable contract and browsable reference for verified server integration endpoints.
layout: openapi
spec: openapi/server.yaml
weight: 10
---

This is a **verified subset**, not a complete inventory or a newly implemented API service. Fourteen operations cover sessions, fleet lists, metrics history/bounds, alerts, reports, tenants, and sites. Contract version is independent of the program release.

[Download OpenAPI 3.0 YAML](/openapi/server.yaml). Reviewed against program commit `eeb6259`; see [accuracy audit](/project/docs-audit/). Each operation records source-handler metadata.

The documentation is public; protected server operations require a user session. User session bearer tokens are distinct from agent tokens. Authorization differs by handler: review each operation's caveats rather than assuming uniform tenant isolation. The [product API roadmap](/development/public-api-roadmap/) prioritizes these gaps.

For local-site operations use the separate [Agent reference](/api/agent/). Machine communication is described under [Agent↔Server protocol](/api/protocol/).

**Request execution is disabled:** this page does not send credentials or requests to your fleet. Import the spec into a local API client, replace the example host with your own HTTPS server, and keep credentials private. No CORS changes or anonymous access are needed to publish a reference page.