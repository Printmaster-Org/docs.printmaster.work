---
title: Server OpenAPI Reference
description: Browse or download the documented Server user-session API subset.
layout: openapi
spec: openapi/server.yaml
weight: 10
---

The Server specification documents 17 user-session operations for login, fleet lists, progressive inventory, metrics history, alerts, reports, tenants, and sites. It is a subset of the Server's routes, not a complete inventory or a guarantee that every existing UI endpoint is a stable public API.

[Download the OpenAPI 3.0 YAML](/openapi/server.yaml). Contract version **0.3.0** is independent of the Server release version. See [progressive inventory](/api/inventory/) for request limits and response fields, and [tenant access](/guides/tenant-isolation/) for user-visible access scope.

Protected operations require a Server user session. Agent machine tokens are not accepted as user credentials. The hosted viewer cannot execute requests; use a local API client against your own HTTPS Server and keep credentials private.

For operations on an Agent itself, use the separate [Agent API reference](/api/agent/). For Agent enrollment and uploads, see the [Agent-to-Server protocol overview](/api/protocol/).
