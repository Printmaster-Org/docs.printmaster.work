---
title: Agent Local OpenAPI Reference
description: Read-only local device and metrics operations with Agent-specific authentication.
layout: openapi
spec: openapi/agent.yaml
weight: 20
---

[Download Agent OpenAPI YAML](/openapi/agent.yaml). Seven GET operations cover saved/discovered devices, profiles, latest metrics, history/bounds, and version. This is a documented subset, not every local Agent route.

This API runs on the **Agent**, usually HTTP `8080` or configured HTTPS `8443`, not the central Server. Only the version endpoint in this subset is explicitly public. Protected endpoints accept the **`pm_agent_session` cookie**, not a server bearer session or an agent-upload token. Loopback access may bypass authentication when allowed; that is a deployment policy, not a client credential.

Loopback access may bypass authentication only when permitted by the Agent's local-auth settings; it is based on the TCP peer, not a forwarded client address. Client-supplied `X-PrintMaster-*` proxy headers are not authentication. Restrict direct Agent access to trusted networks, and do not disable authentication on an untrusted network.

The viewer is read-only and does not accept credentials or execute requests. The spec documents real response differences, null history, and downsampling behavior. Use the [Server API](/api/openapi/) for central integrations; use the [protocol guide](/api/protocol/) for machine uploads.
