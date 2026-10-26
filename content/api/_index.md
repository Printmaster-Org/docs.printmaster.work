---
title: "API Reference"
description: "Choose the PrintMaster API reference for your host and credential."
weight: 60
icon: "⇄"
source: "docs/api/README.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

PrintMaster has separate Server, Agent-local, and Agent-to-Server interfaces. Choose the one that matches the system you are calling and the credential you have.

| Reference | Use it for | Credential |
| --- | --- | --- |
| [Server OpenAPI](/api/openapi/) | Documented Server user-session operations | Server user session |
| [Agent OpenAPI](/api/agent/) | Documented operations on one Agent | Agent session cookie or allowed loopback access |
| [Agent-to-Server protocol](/api/protocol/) | Agent enrollment, uploads, and machine communication | Join token or Agent token |
| [Printer SNMP reference](/api/snmp-reference/) | Standard printer MIBs and SNMP setup guidance | SNMP access configured by an administrator |

The OpenAPI references are subsets of existing routes, not a promise that every UI route is a supported public API. Product versions and API contract versions are separate. The hosted viewer is read-only; it cannot send requests to your Server or store fleet credentials.

## Server connections

The default standalone Server URL is `https://server:9443`. HTTP on port `9090` is intended for a trusted reverse-proxy backend, not direct public access. See [configuration](/guides/configuration/) for listener and TLS settings.

Protected Server operations use a **Server user session**, not an Agent token. A session may be sent as `Authorization: Bearer <session-token>` or the `pm_session` cookie, according to the operation contract.

## Agent connections

Agent-local operations use the `pm_agent_session` cookie unless the operation documents a permitted unauthenticated loopback path. These credentials are not interchangeable with Server sessions or Agent-to-Server machine tokens. See [Agent authentication settings](/guides/configuration/#agent-discovery-and-snmp).

Before automating an operation, review its security requirements, response fields, status codes, limits, and compatibility notes. Keep credentials on your own system and use HTTPS with trusted certificates.
