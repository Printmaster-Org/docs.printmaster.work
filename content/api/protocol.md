---
title: Agent↔Server Protocol
description: Machine enrollment, heartbeat, uploads, updates, and WebSocket boundary.
weight: 30
---

Machine endpoints are hosted on the **Server** and consumed by Agents. They are distinct from both the Server's user-session integration API and the Agent's local API. This page is a verified route/authentication overview, **not a complete payload contract** or AsyncAPI specification.

Reviewed snapshot: `eeb6259f6060c0534798e3d14ac0cd9d289df9a7`.

## Route families

| Server route | Purpose | Authentication boundary |
| --- | --- | --- |
| `/api/v1/agents/register` | Agent registration | Registration handler; do not infer anonymous unrestricted enrollment from its lack of user-session wrapper |
| `/api/v1/agents/register-with-token` | Join-token enrollment | Join token validated by registration handler |
| `/api/v1/agents/heartbeat` | Machine liveness | Agent bearer token, not user session |
| `/api/v1/devices/batch` | Device uploads | Agent bearer token |
| `/api/v1/metrics/batch` | Metrics uploads | Agent bearer token |
| `/api/v1/agents/device-credentials` | Agent credential retrieval | Agent bearer token; sensitive operation |
| `/api/v1/agents/update/manifest` | Update manifest | Agent bearer token |
| `/api/v1/agents/update/download/…` | Update artifact | Agent bearer token |
| `/api/v1/agents/update/telemetry` | Update telemetry | Agent bearer token |
| `/api/v1/agents/ws` | Persistent channel | WebSocket handler's token handshake |

Sources: [server route registrations](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/main.go), [join-token handlers](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/tenancy/handlers.go), [HTTP client](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/agent/agent/server_client.go), [WebSocket implementation](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/websocket.go).

## Credentials are not interchangeable

- **Join token:** bootstrap enrollment; not a user login or permanent fleet API credential.
- **Agent token:** machine uploads/heartbeat; does not grant a Server user session.
- **Server session:** user API/UI access using bearer or `pm_session`.
- **Agent session:** local Agent access using `pm_agent_session`.

Use HTTPS/WSS with trusted certificates. Review enrollment handlers and configuration before making those routes reachable externally. Do not publish token values, printer credentials, or production payload dumps.

## Next contract work

Review machine request/response structs and handler tests before adding a separate protocol OpenAPI spec. Document WebSocket message types, acknowledgments, errors, reconnect behavior, and compatibility using **AsyncAPI**; an HTTP upgrade alone does not specify the message protocol.

The [public API roadmap](/development/public-api-roadmap/) separates user automation credentials from machine tokens and recommends contract ownership/testing in the program repository. Destructive commands and credential retrieval are deliberately excluded from the read-only integration slice.
