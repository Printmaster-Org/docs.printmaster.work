---
title: Agent↔Server Protocol
description: Machine enrollment, heartbeat, uploads, updates, and WebSocket boundary.
weight: 30
---

Machine endpoints are hosted on the **Server** and consumed by Agents. They are distinct from both the Server's user-session integration API and the Agent's local API. This page is a verified route/authentication overview, **not a complete payload contract** or AsyncAPI specification.

Route overview originally reviewed at `eeb6259f6060c0534798e3d14ac0cd9d289df9a7`. Ownership/auth additions below were reviewed at [committed hardening revision 864fc3e](https://github.com/Printmaster-Org/printmaster/tree/864fc3ee040bbb28f25d779c69512c5b6999d421). Historical links below retain the baseline route/client provenance; the security guides identify the containing hardening revision. Neither source snapshot is a product release claim.

## Route families

| Server route | Purpose | Authentication boundary |
| --- | --- | --- |
| `/api/v1/agents/register` | Disabled legacy registration | POST returns `403` JSON directing callers to join-token enrollment; no anonymous token issuance |
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

Device-code approval and machine-bound user login are separate boundaries. See [authentication and enrollment boundaries](/guides/authentication-boundaries/) for tenant/role policy, explicit-only OIDC linking, supported target-bound password/OIDC redirects, required validator ownership fields, serialized device approval, and transactional pending-review token issuance. Hardened validation rejects unbound grants; no machine protocol-version bump is implied. These auth operations remain outside the reviewed read-only OpenAPI subsets.

The [machine ownership safeguards](/api/machine-ownership/) describe atomic storage checks, WebSocket sender binding, async metrics ordering and implemented authenticated-identity binding for HTTP uploads. Existing Agent IDs are not replaced by join-token enrollment; batch success can be partial (`received` versus `stored`). The [tenant-isolation guide](/guides/tenant-isolation/) records combined implementation, compatibility and limitations without expanding this payload-contract scope.

## Next contract work

### Device observation timestamps

Reviewed at [source commit 090483d](https://github.com/Printmaster-Org/printmaster/commit/090483d79ed57c20019126ac4a6d0df1c245cb3f) for the Agent liveness worker, guarded storage writes, existing device upload and Server batch ingestion. This review is limited to observation freshness, not a new complete machine payload contract.

Updated Agents perform compact serial-confirmed liveness checks independently of optional discovery/metrics schedules. Successful observations advance device `last_seen`, then travel through the existing `/api/v1/devices/batch` upload (default five-minute upload cycle). Failed probes, IP reuse with a different serial, and save/unsave operations do not refresh that timestamp. Heartbeat/upload receipt alone is not printer liveness. No message type, payload field or machine-protocol version is added. Offline/Unknown UI/dashboard classifications are described in [device reachability](/guides/devices/#device-reachability-and-stale-scans); cached SNMP history is retained.

User-session `POST`/`DELETE /api/v1/devices/delete` is **not** a machine-token operation. Its owner-qualified Server transaction can return plain-text `409` when ownership changed; optional Agent proxy deletion occurs earlier and is not part of that transaction. Report-run lists are also user-session operations: they omit `result_data`, while authorized detail/download still retrieves the result body. See [tenant isolation](/guides/tenant-isolation/) for compatibility and read-only contract exclusions; neither behavior introduces a machine message or protocol version.

Review machine request/response structs and handler tests before adding a separate protocol OpenAPI spec. Document WebSocket message types, acknowledgments, errors, reconnect behavior, and compatibility using **AsyncAPI**; an HTTP upgrade alone does not specify the message protocol.

The [public API roadmap](/development/public-api-roadmap/) separates user automation credentials from machine tokens and recommends contract ownership/testing in the program repository. Destructive commands and credential retrieval are deliberately excluded from the read-only integration slice.
