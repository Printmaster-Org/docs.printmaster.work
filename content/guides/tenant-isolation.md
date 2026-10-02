---
title: Tenant isolation and security hardening
description: Caller-derived fleet scope, alert/report ownership, machine writes, and remaining validation gates.
weight: 64
---

## Review status and compatibility

Canonical summary of **committed** PrintMaster hardening reviewed on 2026-10-02 at [source revision 864fc3e](https://github.com/Printmaster-Org/printmaster/tree/864fc3ee040bbb28f25d779c69512c5b6999d421). This revision contains the storage/report ownership (`b2e7d39`), alert/settings scope (`431ed7c`), server identity/channels (`bdd4c4f`), and Agent authentication (`864fc3e`) commits and their regression tests. No released build or comprehensive runtime-security certification is claimed. Source paths below refer to that committed program revision.

Routes, legacy response envelopes, and Agent↔Server protocol version are retained. The [Server contract](/api/openapi/) advances independently from 0.2.0 to **0.2.1**, a documentation correction patch with the same 14 operations; the [Agent contract](/api/agent/) retains seven local reads. Stricter auth/ownership intentionally denies formerly accepted unsafe requests: foreign/global visibility may become `403`, hidden resources, or empty results. No optional bypass, product VERSION change, route namespace change, or protocol bump is implied.

## Caller-derived scope

- Server sessions construct principals from current stored users, roles, and complete memberships. Tenant IDs match exactly, case-sensitively. Request filters narrow scope, never grant ownership.
- Global administration is explicit. Membership-free nonadmins cannot obtain unrestricted inventory/report access; empty restricted alert scope returns zero visible rows/counts.
- Stored ownership checks precede sensitive reads, mutations, proxy dispatch and notification effects. Generic RBAC still skips empty resource tenant IDs; handler-specific guards remain essential. This pass does not establish uniform authorization for every route.

## Inventory and metrics

`server/main.go` adds `inventoryAgentScope`, `resolveInventoryAgentScope`, and `authorizeInventoryAgent`. Restricted selections with no agents return `[]` in the legacy device list, or `devices: []`, `total_count: 0`, `has_more: false` with pagination. They never reach storage methods where empty filters still mean unrestricted. Rows/counts share the same selection; missing, unassigned and foreign owners are not caller-owned.

Stored owner checks also cover reviewed device details, credentials, connection diagnostics, device management, proxies and metrics reads. Global fleet/server metrics are administrator-only; inventory summaries use permitted agents/devices. Those additional operations remain **outside** the 14-operation OpenAPI subset.

`POST`/`DELETE /api/v1/devices/delete` also rechecks the authorized Agent owner in the SQL delete transaction, including optional metrics cleanup. A server record removed/replaced after lookup returns plain-text `409` (`Device ownership changed`) without deleting the replacement's device, credentials or metrics or emitting a success event. Optional Agent proxy deletion precedes this transaction and cannot be rolled back by that conflict. Agent-only and global-admin unowned-record paths remain separate; see [machine ownership](/api/machine-ownership/).

**Historical limitation:** metrics and latest-device enrichment still query by serial. New writes prevent another agent from claiming an existing device, but do not repair legacy metrics, ownership reassignment, deletion/recreation or reused serials. History/bounds authorize current ownership, not a historical tenant ledger. `until` remains ignored; raw history is unbounded and `maxPoints=1/2` is not a row cap. Historical exports require reassignment/reuse/backfill tests and an explicit identity design.

## Alerts and notifications

`server/alerts/api.go` receives caller-derived `TenantScope` from Server wiring. Missing/erroring resolvers fail closed; unrestricted scope also requires admin policy. Lists apply visibility before pagination, totals and `has_more`; summaries recompute permitted alerts/rules/channels/maintenance windows. Foreign `tenant_id` returns `403`; omission retains caller scope. Empty lists are `[]`, not `null`. Active/acknowledged selection remains; parsed `status` does not enable historical listing.

Shared rules/channels require access to **every** owning tenant. Fleet/global records are not partially caller-owned because a payload contains a tenant ID. Stored record and referenced target checks precede edits, acknowledgments, resolves, deletes and test notifications. Alert settings, escalation policies (no persisted tenant ownership), and arbitrary channel-test requests are admin-only. Scoped summaries do not expose global quiet-hours state; legacy scope-breakdown counters stay zero. Configuration/write routes remain outside OpenAPI coverage.

Channel updates/deletes also inspect **all** referencing rules and escalation-policy steps, including disabled and legacy records; request filters do not narrow these dependency checks. Restricted callers receive `403` if any referencing rule is foreign/global/fleet or any escalation policy references the channel. Dependency-read failures return `500` without mutation. Same-tenant referencing rules permit updates/deletes; deletion does not rewrite stored channel-ID arrays. Restricted rule creation/update requires each channel to cover every rule tenant, in addition to caller ownership of the channel. Channel ownership changes must retain that coverage for existing referencing rules. Explicit global admins may intentionally override these compatibility checks and create/update policies referencing tenant-owned channels; those channels then require admin mutation while the policy reference exists. These are handler-level checks, not a transactional dependency graph or an escalation-policy tenant schema.

**Limitations:** multi-tenant lists/summaries often load candidates then filter in memory. This does not introduce bounded-query guarantees, durable/signed webhooks, DNS/redirect transport hardening, or an escalation-policy tenant schema.

## Reports, schedules, and results

`server/api_reports.go` requires viewer-or-higher for reads, operator-or-higher for writes, and nonempty memberships for nonadmins. Tenant/site/agent/device definitions need explicit ownership entirely within caller memberships. Empty-tenant built-in fleet definitions are shared **read-only templates**, not permission for global execution/results. Operators manage only their own non-built-in definitions. Referenced agents/sites must match definition tenants. Visibility precedes offset/limit; `count` is page size, and empty `reports` is `[]`.

`server/storage/base_reports.go` matches decoded comma-separated tenant IDs exactly, replacing SQL substring/wildcard matching. Empty scope is not a tenant match. HTTP scope validation rejects empty/comma-containing IDs; no relation-table migration is introduced. Definition `scope` and ordered `tenant_ids` are immutable: clone a definition to change ownership.

New runs persist a versioned `report_security` ownership snapshot in existing `parameters_json`; updates cannot replace it. Visibility requires current parent ownership **and** verified execution ownership. **Legacy/unmarked, malformed and global runs remain admin-only**, including downloads and summary totals. No automatic backfill is claimed. Run creation validates schedule/report association.

Run visibility scans use bounded batches of 100 metadata rows, ordered by `started_at DESC, id DESC`. Caller visibility (including the immutable execution snapshot) precedes page selection; foreign or unverified runs do not consume the visible limit. Scoped summaries use the same metadata-only reads. Batches exclude `result_data` in the SQL projection, not just during serialization. Unrestricted/no-limit requests and scoped summary calculations can still scan all candidate metadata; this is not a fixed total-query or total-memory guarantee.

**Run-list compatibility:** `GET /api/v1/report-runs` and `GET /api/v1/reports/{id}/runs` return the existing `runs` array and page-size `count`, with `[]` for empty pages, but no longer include the optional inline `result_data` field. Clients that consumed bodies from listings must fetch `GET /api/v1/report-runs/{id}` instead; it retains the inline body after authorization, including the existing UI download flow. `GET /api/v1/report-runs/{id}/download` retains its content type, attachment filename and raw body; absent bodies still fall back to run JSON. Both detail paths check metadata ownership before fetching a result body. These run routes remain outside the reviewed OpenAPI subset; no route/protocol version or product version changes are made. The default list limit remains 50; explicit nonpositive limits remain unlimited. HTTP run lists still do not parse `offset`; the internal visibility helper applies a supplied offset only after authorization. Existing filters/serialized metadata remain unchanged.

`server/reports/tenant_scope.go` wraps generator data access, including scheduled jobs, rather than trusting individual report types. It restricts agents/devices, sites, tenants, alerts and matching metric-owner IDs; empty resolved sets stay empty. Tenant-scoped alert-summary generation deliberately fails rather than returning a global aggregate. Schedules/results/generation remain outside the read-only OpenAPI subset.

**Limitations:** broad candidate reads still occur; execution snapshots do not create historical device ownership or certify old outputs. Scheduled report notification delivery remains separate work.

## Machine, proxy, and event boundaries

HTTP device/metrics batches read the authenticated Agent from context **before writes**, reject mismatched payload `agent_id` (`403`), and persist the authenticated ID. Agent credential retrieval also checks credential tenant against stored Agent tenant. Atomic storage guards block token/tenant overwrite, foreign device claims, missing-device metrics and foreign metric owners. Batch `200`/`success: true` can still mean partial persistence: compare `received` with `stored`. See [machine ownership](/api/machine-ownership/) for ordering/recovery.

Join-token registration rejects existing Agent IDs (`409`) before ordinary one-time-token consumption; atomic storage guards handle concurrent collisions. Legacy `POST /api/v1/agents/register` remains disabled (`403` JSON). Same-token/same-tenant storage re-registration does not expose an HTTP refresh/transfer workflow. Pending review and approval-token issuance now commit in one DB transaction: issuance failure rolls back review, allowing retry; losing reviewers issue no token. Historical stranded rows and lost success responses require administrator replacement-token issuance. Concurrent enrollment can still consume a join token before losing the ownership race.

Server proxy forwarding strips central Authorization/session credentials, reserved identity/forwarding/internal headers and hop-by-hop headers; trusted principal headers are inserted separately. Printer proxies preserve non-PrintMaster cookies needed by device UIs. **This does not fix** the Agent's externally supplied `X-PrintMaster-Proxy` bypass or forwarding-header loopback detector. Restrict direct Agent access and sanitize headers at a trusted boundary.

Browser SSE/UI WebSocket delivery revalidates stored sessions/users and ownership per event, plus periodic checks (30 seconds). Restricted subscribers receive only classified owned resource events; unknown/global snapshots/config/release events remain admin-only. Payload tenant claims cannot override storage. Deleted-agent events use trusted server-only ownership metadata. Initial connected/version messages are not fleet-data authorization. This is not AsyncAPI coverage or instantaneous revocation of existing local Agent sessions.

Server-wide logs, sensitive settings/user administration and release mutations require admin authorization. Global managed-settings/update-policy **reads** intentionally remain available through fleet-read policy; writes use server-admin actions. Unassigned-agent settings use server-admin actions. These are not additions to the OpenAPI subset.

## Authentication and callback integration

Provider role normalization preserves `viewer`, maps legacy `user` to `operator`, defaults omitted/empty roles to `viewer` and rejects unknown roles; it does not grant tenant providers global administrator provisioning authority.

See [authentication boundaries](/guides/authentication-boundaries/) for explicit-only OIDC linking, stored-tenant device-code approval and Agent login checks. Password JS now carries the target; OIDC persists it in state-bound redirect data and authorizes ownership before issuance. Validation rejects absent/mismatched targets, rechecks current user/Agent ownership, and returns `authorized`, bound `agent_id`, and stored `agent_tenant_id` required by the Agent. Device approval serializes token issuance with state mutation; pending-registration approval/token creation is transactional. Hardened rejection remains intentional; do not restore legacy unbound acceptance. External-IdP/live-browser validation, response-loss recovery and device-code process-crash limits remain separate gates.

## Required implementation validation

Regression sources were reviewed, **not executed by this docs-only update**. OpenAPI tests/build/link/smoke checks validate documentation, not runtime isolation. Before release, require:

| Boundary | Committed regression coverage / validation gate |
| --- | --- |
| Inventory | `server/tenant_inventory_security_test.go`: empty agent selections, rows/counts, foreign/missing/unassigned ownership and sensitive actions; retain legacy/paginated fixtures. |
| Alerts | `server/alerts/api_test.go`: A/B/multi/empty/admin scopes, pages/totals/summaries, stored/referenced ownership, channels/windows and no unauthorized effects. `server/alerts/api_dependencies_test.go`: persisted legacy foreign/global/fleet/shared rule and policy references, same-tenant mutation, admin overrides, rule/channel compatibility, ownership changes and fail-closed dependency reads. |
| Reports | `server/tenant_reports_security_test.go`, `server/report_run_pagination_test.go`, `server/reports/tenant_scope_test.go`: definitions, schedules/runs/downloads, bounded metadata queries, post-visibility pages, authorized-only body reads, generator filtering and legacy/global result hiding. |
| Storage | `server/storage/tenant_reports_security_test.go`, `tenant_reports_postgres_security_test.go`, `machine_ownership_test.go`, `machine_ownership_postgres_test.go`, `tenant_enrollment_security_test.go`, pending-approval and security-correctness review tests for SQLite/PostgreSQL: exact IDs including `%`/`_`, immutable scopes/snapshots, owner-qualified deletion/history cleanup and approval-token rollback/retry/concurrent losers. |
| HTTP/proxy/events | `server/tenant_server_boundaries_test.go`, `server/websocket_tenant_test.go`: bound batches, credential tenant, explicit callbacks, sanitized headers, live SSE/WS, foreign replies/deletes and replay/revocation. |
| Identity/enrollment/settings | OIDC identity/redirect integration tests, device-auth security/atomic tests, actual login-JS tests, `agent/server_auth_security_test.go`, tenancy/settings/update-policy tests: role normalization, foreign/empty memberships, email/prelinks, target propagation, completed/concurrent codes and unassigned/global policy. |

Run full Agent/Server suites, relevant race tests and PostgreSQL integration tests (`integration` build tag, Docker testcontainers), not only mocked authorizers or selected handlers. Add production-registration/middleware HTTP contract fixtures, reused-serial/ownership-change/history tests, credential redaction and coordinated password/OIDC redirect tests. One dialect or a mock callback fixture does not prove remaining gates.
