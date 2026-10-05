---
title: Server OpenAPI Reference
description: Machine-readable contract and browsable reference for verified server integration endpoints.
layout: openapi
spec: openapi/server.yaml
weight: 10
---

This is a **verified subset**, not a complete inventory or a newly implemented anonymous API service. Seventeen operations cover sessions, fleet lists, progressive inventory, metrics history/bounds, alerts, reports, tenants, and sites. Contract version is independent of the program release.

[Download OpenAPI 3.0 YAML](/openapi/server.yaml). Contract **0.3.0** reviews progressive inventory and changed legacy devices/list at [source revision bdf1f8f](https://github.com/Printmaster-Org/printmaster/tree/bdf1f8fea22e91d490238d9ab266f2690070c82d). These four operations carry that `x-source.commit`; other operations retain the [864fc3e hardening review](https://github.com/Printmaster-Org/printmaster/tree/864fc3ee040bbb28f25d779c69512c5b6999d421). Neither SHA designates a product release. `x-review-notes` records the limited review scope; each operation retains source-handler metadata. See [accuracy audit](/project/docs-audit/).

The documentation is public; protected Server operations require a user session, not an Agent token. Committed inventory/alert/report scope fixes are reflected in each operation; tenancy reads remain admin-only. See [tenant isolation](/guides/tenant-isolation/) for implementation, stricter-access compatibility and remaining history/proxy/callback limits. Contract 0.3.0 adds [three progressive inventory reads](/api/inventory/), preserves all 14 previous operations and existing route namespaces, and changes no product or machine-protocol version. Only these inventory additions and the updated device list were re-reviewed for this slice; other operations retain their prior reviewed source. The [product API roadmap](/development/public-api-roadmap/) distinguishes committed fixes from future stable integration work.

For local-site operations use the separate [Agent reference](/api/agent/). Machine communication is described under [Agent↔Server protocol](/api/protocol/).

**Request execution is disabled:** this page does not send credentials or requests to your fleet. Import the spec into a local API client, replace the example host with your own HTTPS server, and keep credentials private. No CORS changes or anonymous access are needed to publish a reference page.