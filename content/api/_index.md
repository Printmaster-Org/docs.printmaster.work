---
title: "API Reference"
description: "Separate Server, Agent-local, and machine-protocol references."
weight: 30
icon: "⇄"
source: "docs/api/README.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

Choose the reference for the host and credential you use. Reviewed contracts target PrintMaster snapshot `eeb6259`; these are existing APIs, not new stable product interfaces.

| Reference | Coverage | Credential |
| --- | --- | --- |
| [Server OpenAPI](/api/openapi/) | 14 operations: sessions, lists, metrics, alerts, reports, tenancy | Server user session |
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

The OpenAPI reference describes verified request/response details, pagination, and authorization. The public viewer cannot execute requests or retain credentials; use a local API client against your own server.

## Authentication

Protected Server operations accept a **user session token** via `Authorization: Bearer <session-token>` **or** the `pm_session` cookie. Local login returns the token and sets the cookie; use the application's SSO flow when local credentials are unavailable. Role/tenant checks differ between handlers. The expanded spec calls out missing filtering and the empty-agent device-scope edge; do not assume a uniform isolation guarantee.

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
- [Reviewed server routes and auth implementation](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/server/main.go)
- [Reviewed listener defaults](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/server/config.go)
- [Reviewed local agent auth](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/agent/main.go)

For maintaining the contract, see the repository's API maintenance guide.








