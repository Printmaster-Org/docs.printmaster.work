---
title: Agent-to-Server protocol
description: Machine enrollment, uploads, update requests, and WebSocket access.
weight: 30
---

Agents communicate with the central Server over authenticated HTTP and a persistent WebSocket connection. These machine routes are separate from Server user-session APIs and Agent-local UI APIs.

This page is a route and credential overview, not a complete request/response schema or a compatibility guarantee for every internal endpoint. The [Server OpenAPI reference](/api/openapi/) documents its selected user-session operations; it does not cover machine-token routes.

## Route families

| Server route | Purpose | Authentication |
| --- | --- | --- |
| `/api/v1/agents/register-with-token` | Enroll an Agent | One-time join token |
| `/api/v1/agents/heartbeat` | Report Agent liveness and receive managed settings | Agent token |
| `/api/v1/devices/batch` | Upload Agent device inventory | Agent token |
| `/api/v1/metrics/batch` | Upload device metrics | Agent token |
| `/api/v1/agents/device-credentials` | Retrieve credentials for owned devices | Agent token; sensitive operation |
| `/api/v1/agents/device-metadata` | Read Server-owned field pins and submit managed-Agent edits | Agent token; device ownership is checked |
| `/api/v1/agents/update/manifest` | Request update metadata | Agent token |
| `/api/v1/agents/update/download/...` | Download an update artifact | Agent token |
| `/api/v1/agents/update/telemetry` | Report update progress and outcomes | Agent token |
| `/api/v1/agents/ws` | Persistent commands, progress, and proxy messages | Agent token handshake |

The legacy anonymous registration route is disabled. Use the Server's supported Agent enrollment flow instead.

## Credentials are not interchangeable

- A **join token** enrolls an Agent. It is not a user login or a permanent API credential.
- An **Agent token** identifies a machine for heartbeat, inventory, metrics, and other allowed machine operations. It does not grant a Server user session.
- A **Server session** authorizes a human user for Server UI and documented user-session API operations.
- An **Agent session** authorizes access to that Agent's local UI and protected local operations.

Do not put tokens, printer passwords, SNMP communities, or production payloads in documentation or public issue reports. Use HTTPS/WSS with certificates trusted by the Agent and browser.

## Enrollment and uploads

An administrator creates or approves an enrollment request and assigns it to the appropriate organization before distributing a join token. Treat the token as a secret and share it only through the approved enrollment flow.

Agents upload device inventory and metrics separately. Upload success can be partial; clients should inspect returned counts or failure details where available instead of assuming every record was accepted. Device ownership and tenant boundaries are enforced by the Server. Keep the original Agent registration available during replacement or recovery; deleting an Agent can affect its owned inventory and history.

For user-visible behavior such as saved versus discovered devices, see [Devices & inventory](/guides/devices/). For account roles and tenant access, see [Authentication boundaries](/guides/authentication-boundaries/) and [Tenant isolation](/guides/tenant-isolation/).

## Updates and WebSocket access

Update requests use the Agent token. The Server selects and delivers artifacts according to the Agent's supported channel and installation method. A dispatch acknowledgment means the request was accepted for processing, not that installation completed. Check the Agent's reported status and the release notes for the installed version; do not infer an update result from reconnection alone.

The WebSocket channel carries Agent status, commands, and requests to access an Agent or printer through its site network. Access is still subject to the Server user's role/tenant permissions and the Agent's connection state. The proxy is not a direct public connection to the printer.

## Compatibility

The Agent and Server should be upgraded using the supported release path. Optional fields and command support can differ between versions. Do not assume a behavior described for a newer release is available in an older Agent or Server, and do not treat this route overview as a full wire-protocol specification.
