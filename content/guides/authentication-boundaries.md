---
title: Authentication and enrollment boundaries
description: OIDC identity ownership, tenant-scoped device approval, and machine-bound Agent login.
weight: 65
---

This guide describes committed OIDC, device-authorization, and Agent authentication hardening at [source revision 864fc3e](https://github.com/Printmaster-Org/printmaster/tree/864fc3ee040bbb28f25d779c69512c5b6999d421), reviewed 2026-10-02. This revision contains the changes; it is not a product release identifier. Password and OIDC redirect grants now carry explicit targets, authorize stored ownership, and return the target fields required by the hardened Agent. No product VERSION, HTTP route, or machine-protocol version changes are implied.

Reviewed implementation: `server/oidc_handlers.go`, `server/web/login.js`, `server/agent_callback_target.go`, `server/device_auth.go`, `server/storage/pending_approval.go`, `agent/main.go::agentAuthManager`, and callback issuer/validator in `server/main.go`. See [tenant isolation](/guides/tenant-isolation/) for combined boundaries. Focused tests cover real login JS, Server issuance/validation and Agent validation separately; a live external-IdP/browser round trip is not certified by these tests.

## OIDC account ownership

- An existing `(provider slug, subject)` link is the account authority. Explicitly prelinked identities continue to work when email changes or becomes unverified, including privileged users and trusted global providers. Existing links must therefore be audited as privileged account bindings, not inferred from email.
- A new subject **never automatically links to an existing email address**, even with `email_verified=true`, matching tenant membership, or a globally configured provider. An email collision stops login and requires a separately reviewed, explicit identity-linking process. This slice does not add a linking UI or public linking endpoint; do not assume one exists.
- This explicit-only policy avoids deciding provider authority from ambiguous primary/multiple tenant membership and prevents both unverified-email takeover and cross-tenant/privileged account takeover. Global providers have no special email-linking exemption.
- New subjects without an email collision can still be provisioned. Verified email is stored; unverified email is not stored as an ownership attribute. A subject is required.
- Tenant providers provision users only in their configured tenant. A tenant provider configured with the global `admin` role is rejected rather than granting global privilege. Change that provider to `operator` or `viewer` before new users sign in.
- Administrator-configured global providers retain their configured provisioning role, including `admin`. They are an explicit global trust decision, not tenant-limited authorities. Previously prelinked administrator identities are not silently downgraded.
- Provider create/update payloads trim and lowercase `default_role`, preserving explicit `admin`, `operator`, and `viewer`. Legacy `user` intentionally normalizes to `operator`; an omitted/empty role defaults to `viewer`, and unknown roles return `400`. Configured `viewer` no longer becomes `operator`. Clients relying on the old omitted-role operator default must now send `operator` explicitly; an update omitting this field also sets `viewer`, rather than preserving the previous role.

**Compatibility:** users who depended on email-only linking must obtain a reviewed explicit subject binding. Already-linked users are unaffected. New unverified-email accounts no longer retain that email; email-based recovery/invitation workflows should not treat it as verified account ownership.

## Device authorization codes

Agent enrollment starts at `POST /api/v1/agents/device-auth/start` and polls at `POST /api/v1/agents/device-auth/poll`. These are bootstrap endpoints, not Server user-session login. The poll token remains the credential for retrieving the enrollment outcome/join token.

The following Server user-session routes require `agents.write`, not merely authentication:

| Method and route | Ownership boundary |
| --- | --- |
| `GET /api/v1/device-auth/requests/{code}` | Authorize against the request's stored assigned tenant before disclosing metadata |
| `POST /api/v1/device-auth/requests/{code}/approve` | Authorize stored ownership and the selected target tenant; do not reassign a request to another tenant |
| `POST /api/v1/device-auth/requests/{code}/reject` | Authorize stored ownership before changing state |

Unauthenticated calls return `401`; viewers and foreign-tenant operators return `403`. Unknown/expired codes return `404` after authentication. Approval of a completed request or an attempted tenant reassignment returns `400`. Rejection of an already completed request or one whose tenant changed after authorization returns `400` without replacing its state/join token.

An **unassigned pending request** is deliberately shared by code possession: an administrator, or an operator with at least one accessible existing tenant, can inspect/reject it and choose an authorized tenant for approval. An operator with no accessible tenants cannot use the global code namespace. This is not tenant ownership derived from submitted metadata, IP address, or a client-selected tenant. Protect the short-lived code and independently confirm the displayed Agent identity before approval. Assigned requests use stored ownership; possession of their code is insufficient. Unassigned terminal requests are administrator-only.

Device-code token issuance is serialized with approval/rejection under the request-store lock. Only a still-pending request with unchanged authorized ownership can mint a token; losing reviewers mint none. Issuance failure returns `500`, leaving the request pending for retry. Returned snapshots are copies, not mutable shared state. This store remains in-memory: restart loses device codes, and process death after DB insertion but before in-memory publication can orphan a token. Polling waits behind approval; token hashing/DB work holds the request-store lock.

Pending-registration admin approval (`POST /api/v1/pending-registrations/{id}`, `action: approve`) uses `server/storage/pending_approval.go::ApprovePendingRegistrationWithToken` to commit the pending-only review transition and a 24-hour one-time join token in one DB transaction on SQLite/PostgreSQL. Losing transitions return `409` without persisting tokens; issuance failure returns `500`, rolls back review, and remains retryable. Missing registrations/tenants return `404`; an already-reviewed row returns `409`. Success JSON contains `success`, `join_token`, and `token_expires`; approval events/audit are emitted only after commit. Raw secrets are not stored: a lost response after commit cannot replay the token. Administrators can issue a replacement through the existing join-token operation. Historical stranded approved rows are not automatically repaired; ordinary join-token consumption/enrollment remains separate. Unlike device-code approval above, this state/token pair is durable and transactional, not an in-memory lock plus a separate DB write.

## Direct username/password login to an Agent

In server authentication mode, the Agent uses its current configured, persisted `Server.AgentID`, populated by the existing startup/enrollment identity flow. Authentication does not generate a replacement ID or accept an ID from the browser. Missing identity fails closed before contacting the Server.

1. `POST /api/v1/auth/login` on the Server authenticates the supplied credentials and returns a Server user-session token.
2. The Agent reads `GET /api/v1/auth/me` using that token.
3. The Agent also reads **`GET /api/v1/agents/{persisted AgentID}` using the same authenticated Server session**. The registered Server route uses its user-session middleware and authorizes against the stored Agent tenant. A successful `/me` response alone is never enough.
4. The returned `agent_id` must exactly match this Agent. For `operator`/`viewer`, the returned nonempty tenant must be in the Server-returned user's tenant memberships. Unknown roles/empty usernames fail closed. Global admins may access a differently assigned or unassigned Agent, but still require a successful target response with the exact Agent ID.
5. Only then is a separate local `pm_agent_session` cookie issued. Server tokens are not Agent cookies. Non-200, malformed, missing, or mismatched target responses do not create a local session. Auth HTTP requests do not follow redirects.

This preserves authorized existing password login on a Server whose Agent-details route enforces tenant access. Browser-supplied `authorized`, `agent_id`, or tenant flags cannot authorize a session. Agents without a configured persisted identity, missing Server records, or users with no Agent tenant access can no longer log in through this path.

## Redirect callback: target-bound integration

**Implemented explicit checks:** `POST /api/v1/auth/agent-callback` requires a Server user session, nonempty `agent_id`, a real accessible stored Agent and safe callback URL (HTTPS, or HTTP only on exact `localhost`, `127.0.0.1`, or `::1`; no userinfo/opaque/non-HTTP URLs or backslash/control-character transport hints). Conflicting issuer/URL targets or repeated callback-URL `agent_id` parameters return `400`. It issues a five-minute target-bound one-time grant. Validation consumes the grant even when target validation later fails: invalid/expired/replayed tokens return `401`; omitted/mismatched target or revoked current user/Agent access returns `403`. Success returns `valid`, `authorized`, bound `agent_id`, current stored `agent_tenant_id`, user fields and expiry. Browser hints cannot override grant ownership.

Existing paths are preserved:

- Server login redirect points back to `/api/v1/auth/callback` on the Agent. The Agent includes its persisted `agent_id` in both the Server login query and callback URL query; those hints **are not authorization**.
- The Agent validates at `POST /api/v1/auth/agent-callback/validate` on the configured Server, sending JSON with **`token` and its own persisted `agent_id`**. Browser query flags/IDs are ignored for validation authority.

The required successful JSON response includes:

| Field | Required meaning |
| --- | --- |
| `valid: true` | Callback credential passed validation |
| `authorized: true` | Server authorized the current user for the token-bound target Agent |
| `agent_id` | Exact persisted Agent ID authorized and bound to this token, not an echo of the request |
| `agent_tenant_id` | Target Agent's current stored tenant; required and nonempty for nonadmins |
| `username`, `role` | Current authorized user identity; role must be `admin`, `operator`, or `viewer` |
| `tenant_ids` (or legacy `tenant_id`) | Current user's memberships; nonadmins must include the target tenant |
| `expires_at` | Valid future RFC3339 expiration; no missing/expired fallback |

**Password browser redirects:** real login JS posts both `callback_url` and `agent_id` after Server password login. Target comes from the login query or callback URL; both must agree if present. Missing/conflicting targets stop issuance. This differs from direct Agent password login above.

**OIDC redirects:** JS forwards target and redirect to `/auth/oidc/start/{slug}`. Start validates transport/target before discovery, persisting the reconciled target in the existing state-bound redirect URL. Callback uses that saved URL, never callback-request target hints, rechecks stored Agent/user scope, and issues a bound grant. Unsupported/unsafe/missing callback targets return `400` at start; inaccessible targets redirect to `/login?error=oidc_agent` without minting a grant. A Server user session may already exist on Agent denial; no Agent cookie is issued. Arbitrary external non-callback and protocol-relative OIDC redirects normalize to `/`. Callback recognition uses exact `/api/v1/auth/callback` path.

**Compatibility:** legacy responses containing only `valid`, user fields and expiry remain rejected. Deploy matching Server issuer/UI/validator and Agent hardening together; never weaken validation to accept unbound grants. Agent validation failure yields `invalid_token` without a cookie; password issuance failure occurs earlier. Direct Agent password login remains available to authorized users; local-admin/disabled-mode behavior is unchanged. Existing Agent sessions are not continuously revalidated. Callback URLs are transport-validated and target-bound, not registered-origin allowlisted; trusted browser navigation and TLS remain necessary.

## Reference scope and validation

These login, callback, and device-code operations are **outside** the reviewed read-only [Server OpenAPI subset](/api/openapi/) and [Agent OpenAPI subset](/api/agent/). This guide records the changed boundary without claiming either contract covers all auth endpoints. Their operation schemas/contract versions are unchanged. The [machine protocol overview](/api/protocol/) describes separate enrollment/upload credentials, not these local user-session guarantees.

Focused tests cover OIDC identity/payload roles and bound redirect issuance, device approval/rejection races and immutable copies, pending-approval rollback/retry/concurrent losers, actual login-JS target propagation, required Server validation fields/replay, and hardened Agent denial cases. Agent tests use a mock Server; OIDC helper tests do not exercise external IdP exchange. Agent forwarding-header loopback detection and externally supplied internal-proxy-header bypass remain separate security limitations; restrict direct access and sanitize headers.