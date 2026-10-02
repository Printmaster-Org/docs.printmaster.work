---
title: Server OpenAPI Reference
description: Machine-readable contract and browsable reference for verified server integration endpoints.
layout: openapi
spec: openapi/server.yaml
weight: 10
---

This is a **verified subset**, not a complete inventory or a newly implemented API service. Fourteen operations cover sessions, fleet lists, metrics history/bounds, alerts, reports, tenants, and sites. Contract version is independent of the program release.

[Download OpenAPI 3.0 YAML](/openapi/server.yaml). Contract **0.2.1** reviews committed hardening at [source revision 864fc3e](https://github.com/Printmaster-Org/printmaster/tree/864fc3ee040bbb28f25d779c69512c5b6999d421). This SHA contains the implementation, not a product release designation. `x-review-notes` records that distinction; each operation retains source-handler metadata. See [accuracy audit](/project/docs-audit/).

The documentation is public; protected Server operations require a user session, not an Agent token. Committed inventory/alert/report scope fixes are reflected in each operation; tenancy reads remain admin-only. See [tenant isolation](/guides/tenant-isolation/) for implementation, stricter-access compatibility and remaining history/proxy/callback limits. The patch preserves all 14 operations, refs and route namespaces; it does not bump the product or machine protocol. The [product API roadmap](/development/public-api-roadmap/) distinguishes committed fixes from future stable integration work.

For local-site operations use the separate [Agent reference](/api/agent/). Machine communication is described under [Agent↔Server protocol](/api/protocol/).

**Request execution is disabled:** this page does not send credentials or requests to your fleet. Import the spec into a local API client, replace the example host with your own HTTPS server, and keep credentials private. No CORS changes or anonymous access are needed to publish a reference page.