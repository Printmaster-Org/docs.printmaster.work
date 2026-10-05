---
title: "API Reference"
description: "Separate Server, Agent-local, and machine-protocol references."
weight: 30
icon: "⇄"
source: "docs/api/README.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

Choose the reference for the host and credential you use. Server contract 0.3.0 reviews progressive inventory and changed legacy devices/list at **committed** source revision `bdf1f8fea22e91d490238d9ab266f2690070c82d`. Other Server operations retain the `864fc3ee040bbb28f25d779c69512c5b6999d421` hardening review; this is not a whole-API audit. Agent contract remains the seven-operation `eeb6259` snapshot. These are existing APIs, not new stable product interfaces or a product release announcement.

| Reference | Coverage | Credential |
| --- | --- | --- |
| [Server OpenAPI](/api/openapi/) | 17 operations: sessions, lists, progressive inventory, metrics, alerts, reports, tenancy | Server user session |
| [Agent OpenAPI](/api/agent/) | 7 local read operations: devices, profiles, metrics, version | Agent session cookie or allowed loopback access |
| [Agent↔Server protocol](/api/protocol/) | Enrollment/upload/update/WebSocket route overview; payload contract pending | Join/agent tokens |

Existing UI endpoints have **no separate broad, stable public-API compatibility guarantee**. See the [concrete product API roadmap](/development/public-api-roadmap/) for proposed changes in the program repository.

## Server API

The default standalone server uses **`https://localhost:9443`**. Replace localhost with your server's hostname for remote clients and configure trusted TLS. HTTP on port **9090** is optional: it requires reverse-proxy mode (`BEHIND_PROXY=true`, `PROXY_USE_HTTPS=false`), with public HTTPS terminated at your trusted proxy. `PROXY_USE_HTTPS=true` selects HTTPS upstream instead. See [configuration](/guides/configuration/).

The specification includes these core operations plus read-only metrics, alerts, reports, tenants, and sites:

| Operation | Method and path |
| --- | --- |
| Local user login | `POST /api/v1/auth/login` |
| Current user | `GET /api/v1/auth/me` |
| Logout | `POST /api/v1/auth/logout` |
| Accessible agents | `GET /api/v1/agents/list` |
| Fleet devices | `GET /api/v1/devices/list` |
| Lightweight inventory index | `GET /api/v1/devices/index` |
| Selected full inventory rows | `POST /api/v1/devices/rows` |
| Selected lazy latest metrics | `POST /api/v1/devices/metrics/query` |

See [progressive inventory](/api/inventory/) for exact response fields and limits. Index, row and metric requests independently reauthorize the current session; tenant predicates and serial keys are enforced in SQL. Full rows precede lazy metrics beyond page count. Legacy lists retain toner enrichment, pagination and envelopes.

The OpenAPI reference describes verified request/response details, pagination, and authorization. The public viewer cannot execute requests or retain credentials; use a local API client against your own server.

## Authentication

Protected Server operations accept a **user session token** via `Authorization: Bearer <session-token>` **or** the `pm_session` cookie. Local login returns the token and sets the cookie; use the application's SSO flow when local credentials are unavailable. Committed hardening fixes the empty-agent device-list leak and derives alert/report visibility from the principal before totals/pagination. Shared report templates do not authorize global results; tenant/site list reads remain admin-only. See [tenant isolation](/guides/tenant-isolation/) for exact boundaries, limitations and required tests, and [authentication boundaries](/guides/authentication-boundaries/) for target-bound callback integration and approval recovery limits.

**Compatibility:** stricter auth/ownership can deny previously accepted unsafe access. Existing URLs/envelopes and machine protocol remain unchanged; contract 0.3.0 independently adds three Server web-user inventory operations to the reviewed subset, not a product release or whole-API audit.

**Agent bearer tokens are different credentials:** agent-to-server authentication does not grant a user session for these operations. Never publish either kind of credential in documentation or send it to this public docs site.

## Agent API

Local Agent routes have a [separate specification](/api/agent/) and `pm_agent_session` cookie authentication. In local auth mode, loopback admin bypass requires `allow_local_admin = true`. The wrapper also examines forwarding headers; restrict direct agent access and sanitize those headers at a trusted proxy. Disabled auth is unsafe on untrusted networks. See [agent auth configuration](/guides/configuration/#authentication-settings).

## Error Responses

Check HTTP status and response content type. Reviewed server handlers and auth middleware use plain-text errors via `http.Error`; do not assume a universal JSON `error`/`details` envelope. The specification documents per-operation responses such as 400, 401, 403, 405, and 500 where applicable.

### Error Handling

This heading preserves the former `#error-handling` anchor. Use the [documented error responses](#error-responses) rather than the old generic JSON example.

## Rate Limiting

There is no verified universal requests-per-minute contract for this subset. Configurable failed-auth tracking exists, but enforcement differs by handler: agent-token middleware checks blocks and can return 429; local user login records failures without checking a block before authenticating at this snapshot. Do not infer uniform login or fleet-endpoint throttling.

## See Also

- [Server OpenAPI reference](/api/openapi/)
- [OpenAPI YAML](/openapi/server.yaml)
- [Targeted documentation accuracy audit](/project/docs-audit/)
- [Tenant isolation and committed security hardening](/guides/tenant-isolation/)
- [Machine ownership safeguards](/api/machine-ownership/)
- [Reviewed inventory routes and scoped-list handler](https://github.com/Printmaster-Org/printmaster/blob/bdf1f8fea22e91d490238d9ab266f2690070c82d/server/main.go)
- [Reviewed progressive inventory handlers](https://github.com/Printmaster-Org/printmaster/blob/bdf1f8fea22e91d490238d9ab266f2690070c82d/server/inventory_api.go)
- [Reviewed SQL inventory projections and ownership predicates](https://github.com/Printmaster-Org/printmaster/blob/bdf1f8fea22e91d490238d9ab266f2690070c82d/server/storage/inventory.go)
- [Reviewed listener defaults](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/server/config.go)
- [Reviewed local agent auth](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/agent/main.go)

For maintaining the contract, see the repository's API maintenance guide.








