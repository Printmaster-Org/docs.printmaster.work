---
title: Agent Local OpenAPI Reference
description: Read-only local device and metrics operations with Agent-specific authentication.
layout: openapi
spec: openapi/agent.yaml
weight: 20
---

[Download Agent OpenAPI YAML](/openapi/agent.yaml). Seven verified GET operations cover saved/discovered devices, profiles, latest metrics, history/bounds, and version. Reviewed against program commit `eeb6259`.

This API runs on the **Agent**, usually HTTP `8080` or configured HTTPS `8443`, not the central Server. Only the version endpoint in this subset is explicitly public. Protected endpoints accept the **`pm_agent_session` cookie**, not a server bearer session or an agent-upload token. Loopback access may bypass authentication when allowed; that is a deployment policy, not a client credential.

**Security warning:** This source snapshot's authentication wrapper directly examines proxy/forwarding headers. Restrict direct Agent access and sanitize incoming headers at a trusted proxy. Do not expose local Agent APIs to untrusted networks. Authentication-disabled mode is not a safe integration setup.

The viewer is read-only and does not accept credentials or execute requests. The spec documents real response differences, null history, and downsampling behavior. Use the [Server API](/api/openapi/) for central integrations; use the [protocol guide](/api/protocol/) for machine uploads.
