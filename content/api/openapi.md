---
title: Server OpenAPI Reference
description: Machine-readable contract and browsable reference for verified server integration endpoints.
layout: openapi
weight: 10
---

This is an **initial verified subset**, not a complete inventory or a newly implemented API service. Five existing server operations are described: login, current user, logout, agents, and devices. Contract version is independent of the program release.

[Download OpenAPI 3.0 YAML](/openapi/server.yaml). Reviewed against program commit `565f4c0`; see [accuracy audit](/project/docs-audit/).

The documentation is public; your PrintMaster server still requires authentication and role/tenant authorization. User session bearer tokens are distinct from agent tokens.

**Request execution is disabled:** this page does not send credentials or requests to your fleet. Import the spec into a local API client, replace the example host with your own HTTPS server, and keep credentials private. No CORS changes or anonymous access are needed to publish a reference page.