---
title: "Public API Improvement Roadmap"
description: "Source-backed proposals for a scoped, read-only integration API, contract testing, and reliable webhook delivery."
weight: 45
sourceCommit: "eeb6259f6060c0534798e3d14ac0cd9d289df9a7"
---

## Status and scope

This is a proposal for improvements to **Printmaster-Org/printmaster**, not a description of newly implemented functionality or a release commitment. The implementation baseline is [commit eeb6259f6060c0534798e3d14ac0cd9d289df9a7](https://github.com/Printmaster-Org/printmaster/tree/eeb6259f6060c0534798e3d14ac0cd9d289df9a7). All program-source evidence below is pinned to that full revision. The documentation website should publish the contract; it should not become the implementation owner or an intermediary for customer credentials and fleet data.

The first supported integration surface should be read-only inventory and bounded metrics retrieval from the central server. Existing browser routes, agent ingestion, onboarding, and proxy operations are separate compatibility surfaces. Calling an endpoint a REST API does not by itself establish a stable external contract.

Research included concrete handlers, storage queries, authorization policies, notifier code, and tests. Selected existing tests passed in the server, authorization, storage, and reporting packages: `TestHandleAgentsList_TenantFiltering`, `TestHandleAgentDetails_DeleteRespectsTenantScope`, `TestAuthorizeRolePolicies`, `TestSessionLifecycle`, `TestSortTenantIDs`, the CSV formatter tests listed below, and `TestFormatter_FormatJSON`. This was not a full-suite run. No end-to-end cross-tenant disclosure or SSRF exploit was reproduced. The confirmed control-flow and query gaps below are reasons to add reproducing regression tests before publishing stronger guarantees, not a claim that every route or deployment is vulnerable.

## Priority order

| Priority | Outcome | Publication gate |
| --- | --- | --- |
| P0 | Explicit tenant restrictions and regression coverage | Scoped empty results can never become unrestricted queries. |
| P1 | Separate service credentials | Read scopes, tenant bounds, hashing, expiry, rotation, and revocation are tested. |
| P1 | Stable inventory and metrics routes | A single response shape and bounded database queries are documented and tested. |
| P1 | Common errors and request budgets | Invalid inputs, resource limits, and cancellation have predictable behavior. |
| P1 | Program-owned contract and CI drift checks | The specification is tested against the production route stack. |
| P2 | Reliable signed webhook delivery | Durable retries and outbound destination controls precede reliability guarantees. |
| P2 | Tested clients and export examples | Examples use the supported read contract rather than privileged UI operations. |

## P0: Make tenant isolation an explicit query invariant

### Current evidence and verified gaps

The central server has real RBAC and tenant checks. [Principal construction and tenant helpers](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/main.go#L81-L173) distinguish an unrestricted administrator from a non-admin without tenant memberships; `tenantScope` rejects the latter. Tenant membership is exact, case-sensitive ID matching. [Authorization policy](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/authz/authz.go#L58-L143) checks roles and supplied resource tenant IDs, but skips empty IDs and has no tenant check when `ResourceRef` contains none. This means handler and storage scoping remain essential; authentication or an action check alone is not the isolation boundary.

The following narrower gaps are directly visible:

1. **A scoped device list with no matching agents loses its restriction.** [The device handler](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/main.go#L6566-L6688) starts with an empty `allowedAgentIDs` list. Its legacy branch filters only when that list is nonempty. Its paginated branch passes the empty list to [count and pagination storage methods](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/storage/base_store.go#L738-L804), where length zero means all devices. This confirms an empty-filter control-flow defect in both branches. A regression fixture should give tenant A membership but no agents, while tenant B has an agent and device, and assert that neither rows nor totals from B are returned.
2. **Report tenant filtering is substring matching, not membership matching.** [Report storage](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/storage/base_reports.go#L101-L145) uses `tenant_ids LIKE '%<requested ID>%'` and also includes empty tenant lists. Thus an ID such as `tenant-a` can match stored `tenant-ab`; `%` and `_` in the requested ID are SQL pattern characters. Parameters avoid SQL injection but do not make the membership predicate exact. This is a storage-filter correctness gap, not a reproduced HTTP authorization bypass. [The report-list handler](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/api_reports.go#L85-L157) does not populate that tenant filter from the principal, so changing `LIKE` alone would not establish report authorization.
3. **Some read handlers lack a caller-derived resource scope.** [Alert listing and summary](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/alerts/api.go#L190-L283) authorize with an empty resource reference; listing takes `tenant_id` from the query and summary calls an unscoped store method. [Report-result retrieval](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/api_reports.go#L483-L547) loads a run by ID without a handler-local ownership check. These are specific review targets, not evidence that all alert/report routes share identical behavior.
4. **Metrics identity needs a separate audit.** [Metrics history authorization](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/main.go#L7616-L7726) checks the device's current owning agent, while [history and latest-metrics queries](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/storage/base_store.go#L978-L1070) select by serial rather than tenant/agent identity. Test ownership reassignment and reused serials before promising historical tenant isolation. The [SQLite device schema](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/storage/sqlite.go#L124-L145) uses serial as the device primary key; introducing a composite public identity requires deliberate storage design, not just a URL rename.

Existing [handler regressions](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/rbac_handlers_test.go#L14-L113) cover a nonempty tenant-filtered agent list and foreign-tenant deletion. [Policy tests](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/authz/authz_test.go#L10-L128) cover role and tenant mismatch cases. They do not establish empty-agent device-list isolation or HTTP coverage of all reads.

### Tenant-isolation components

Update the existing principal/tenant helpers, `handleDevicesList`, storage count/list interfaces, authorization policy, alert API, and report API. Introduce a typed query restriction that explicitly distinguishes unrestricted access from a restricted empty set. Apply that same restriction to items, counts, aggregates, metrics enrichment, and downloads. Prefer tenant-constrained SQL joins over loading the whole fleet and filtering in memory. For reports, use exact membership through a relation table or another dialect-tested representation; explicitly classify globally shared built-in definitions separately from tenant-owned results.

Use canonical stored IDs and exact matching consistently. Normalize whitespace at documented input boundaries, not through case folding, substring comparisons, or wildcard matching. A requested tenant, agent, or device filter must narrow the authenticated scope, never replace it. Missing ownership should fail closed for scoped integrations; keep administrator-wide access an explicit policy rather than an accidental empty slice.

### Tenant-isolation acceptance tests

- Reproduce the empty-agent device-list case with and without `limit`; require empty arrays, zero totals, and `has_more=false`. Also cover no tenant memberships, a deleted agent, and unassigned agents/devices.
- Exercise tenant A, tenant B, multi-tenant users, viewer/operator/admin roles, and later service scopes through registered HTTP routes plus real middleware and SQLite storage. Extend the same query assertions to PostgreSQL integration tests.
- Require identical scope for detail reads, counts, summaries, history, enrichment, and report downloads. Include foreign IDs, omitted tenant filters, and conflicting tenant/agent filters.
- Require exact report membership for `tenant-a` versus `tenant-ab`, comma-separated memberships, case variants, and literal `%`/`_`. Decide and test empty report scopes explicitly.
- Add reused-serial and ownership-reassignment fixtures before exposing metrics history through the new API. Do not claim a failure was reproduced until these fixtures demonstrate it.

### Tenant-isolation compatibility and rollout

Ship the empty-agent regression and fix first, preserving legacy response shapes. Isolation corrections are not optional compatibility flags. Audit alert/report behavior in separate PRs; document tightened access for callers that relied on broad visibility. Keep alerts, reports, and historical metrics outside the supported integration allowlist until their individual gates pass. Schema changes need upgrade/backfill tests for both database dialects and explicit ownership rules for old rows.

## P1: Add scoped service credentials without repurposing sessions or agent tokens

### Credential evidence

[Web authentication](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/main.go#L1658-L1722) accepts a user session through `Authorization: Bearer` or the `pm_session` cookie. [Login and cookie creation](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/main.go#L1767-L1865) create sessions with `60*24` minutes of lifetime and return the session token. These are user identities governed by role and tenant membership, not named integration identities with operation scopes.

Importantly, **sessions are already hashed and revocable**: [session storage](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/storage/base_store.go#L1729-L1808) stores SHA-256 of a random raw token, checks expiration, and supports deletion by raw token or stored hash. [Session lifecycle tests](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/storage/sqlite_sessions_test.go#L8-L113) exercise retrieval, deletion, and expiry. The proposal adds a different credential type; it is not a claim that existing sessions are stored in plaintext or cannot be revoked.

Agent credentials are another distinct path: [agent authentication middleware](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/main.go#L1555-L1651) looks up an agent and supplies agent context; [agent-token lookup](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/storage/base_store.go#L253-L275) compares the supplied token against the agent token column. It is not user-session authentication. Onboarding join tokens should likewise remain separate from integration credentials.

### Service-credential components

Add a service-credential storage module and migrations in the program repository, extending the existing storage interfaces and SQLite/PostgreSQL initialization paths. Add dedicated middleware and credential-management handlers wired from the server's route registration. Extend the principal/authorization representation to carry credential kind, credential ID, explicit tenant IDs, and scopes without synthesizing an administrator user.

Issue a random, high-entropy secret once with a nonsecret lookup ID. Store only its hash, descriptive name, tenant bindings, scopes, creator, expiry, revocation time, and last-used metadata. Reuse the session hashing approach for high-entropy opaque secrets rather than storing retrievable secrets. Compare verifiers in constant time where applicable; redact raw credentials from logs, audit entries, and list responses. Management must require an authenticated administrator initially and reject scope or tenant grants outside the issuer's authority.

Start with `agents.read`, `devices.read`, and a separately gated `metrics.history.read`. Credentials must not imply proxy, settings, user administration, agent onboarding, ingestion, restart, or update rights. Use credential-specific bearer recognition only on an allowlisted integration route stack; an invalid service credential must not silently fall back to a session cookie. Add audited create/list/revoke operations and rotation by overlapping independently revocable credentials. Use a documented expiry policy, not an unbounded lifetime by default.

### Service-credential acceptance tests

Prove one-time secret disclosure, hash-at-rest rather than raw-token storage, correct/incorrect secret validation, expiry, idempotent revocation, rotation overlap, and immediate rejection after revocation. Cover missing scopes, cross-tenant requests, revoked credentials on every supported read route, tenant deletion, and issuer privilege changes according to the chosen policy. Verify that service secrets are rejected by agent ingestion and interactive/session routes, and that agent tokens do not authenticate integrations. Database lookup errors must fail closed. Test audit/log redaction and permission changes on both database backends.

### Service-credential compatibility and rollout

Make schema changes additive. Keep existing user login, cookies, session bearer requests, and agent protocols unchanged. Launch credential administration before enabling the new read routes; keep the integration surface opt-in during preview. Do not lengthen user session TTLs to approximate service credentials. Hashing or rotating existing agent tokens is a separate protocol/storage migration and should not block the first read-only service credential PR.

## P1: Publish a small stable read contract with bounded pagination and filters

### Read-route evidence

[Agent listing](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/main.go#L4285-L4428) and [device listing](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/main.go#L6566-L6688) return legacy arrays unless `limit` is nonempty. With `limit`, they return envelopes; invalid/nonpositive limits become 50 and limits above 200 are clamped. This is useful existing pagination, but the response type depends on query presence. The reviewed handlers do not implement a general inventory filter contract. Agent responses embed a storage object after blanking its token, rather than using a dedicated external field allowlist.

[Paginated device SQL](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/storage/base_store.go#L757-L804) orders by `last_seen DESC` without a unique tie-breaker. [History retrieval](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/main.go#L7610-L7726) reads `since` but not the commented `until`; `raw=true` bypasses downsampling. Even non-raw requests fetch history before reducing points. These are concrete integration and query-budget gaps, not an absence of all metrics support.

### Proposed components and contract

Create an integration API component registered separately from UI and agent routes in the program repository. Reuse storage services and authorization, not HTTP proxying to browser endpoints. Proposed paths, **not implemented routes**, are:

| Proposed read operation | Initial behavior |
| --- | --- |
| `GET /api/integrations/v1/agents` | Allowlisted inventory and connectivity fields; tenant/status filters. |
| `GET /api/integrations/v1/devices` | Allowlisted inventory with latest metrics and freshness; tenant/agent/manufacturer filters. |
| `GET /api/integrations/v1/agents/{agent_id}/devices/{serial}` | Ownership-qualified lookup; defer if storage identity cannot support it safely. |
| `GET /api/integrations/v1/agents/{agent_id}/devices/{serial}/metrics` | Bounded `since`/`until` interval after historical ownership tests pass. |

Always return an envelope such as `items` plus `next_cursor`, including an empty array rather than `null`. Begin with page size 50 and maximum 200 as proposed defaults, not claims about new behavior. Use a deterministic keyset ordering with a unique immutable tie-breaker. Bind opaque, validated cursors to the sort and normalized filters; reauthorize every page and never treat a cursor as permission. State that live inventory can change between pages; do not promise snapshot consistency without implementing it. Do not require expensive exact totals in every response.

Accept only documented filters and validate enums/timestamps. A caller may select tenants only within its credential bounds. Apply filters and row limits in SQL using parameters; design indexes from measured query plans on SQLite and PostgreSQL. Define UTC timestamps, counter units, nullable/missing metrics, connectivity status, and best-effort metric freshness in dedicated DTOs. Do not expose raw SNMP data, internal paths, tokens, or future storage fields accidentally. Latest-metrics failure should be represented explicitly rather than mistaken for a measured zero.

For history, implement an upper time bound and database-side row bounds or aggregation. A proposed initial maximum of 31 days and 10,000 points should be validated against real fleet sizes and retention; return a structured error or a documented continuation, never silently call partial raw data complete. Default downsampled chart data must be distinguishable from raw samples. Resolve the serial/agent identity concern in P0 before publishing the history operation.

### Read-route acceptance tests and rollout

Test absent/empty/invalid/oversized limits, cursor tampering, foreign-tenant cursor reuse, tied sort keys, concurrent inserts, unknown filters, UTF-8 values, empty fleets, and metric lookup failure. Verify stable response types, field redaction, consistent units, and no rows outside scope. Measure SQL limits, indexes, and memory consumption on a representative large fleet. Test `since`/`until` parsing, reversed intervals, boundary timestamps, cancellation, and the history cap at the database boundary.

Add these routes without changing existing `/api/v1/*/list` shapes. Publish preview inventory first, then a versioned compatibility policy covering additive optional fields, enum evolution, deprecation notices, and breaking changes in a new major API namespace. Metrics is a later read-only slice, not a reason to delay safe inventory. Alerts and report results enter the supported contract only after their authorization audits; agent/device proxies never enter the initial allowlist.

## P1: Standardize errors and enforce actual request budgets

### Error and request-budget evidence

The server already defines HTTP timeouts and a 1 MiB body constant in [server configuration constants](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/main.go#L70-L78). Its [JSON helper](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/main.go#L1759-L1764) uses `io.LimitReader`, not an explicit 413-producing body limiter or a check for trailing JSON. Other components use their own decoding helpers, such as [release API decoding/errors](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/releases/api.go#L254-L273). Existing authentication failure tracking in [the rate limiter](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/auth_ratelimit.go#L14-L165) is not a per-service successful-request or expensive-query budget. Several inventory/history handlers above use `context.Background()` rather than request cancellation. Error responses mix plain text and JSON across components.

### Error and request-budget components

Add shared integration error/validation middleware with a consistent JSON envelope containing `code`, a safe `message`, and server-generated `request_id`, with optional structured field errors. Define 400, 401, 403, 404, 405 with `Allow`, 413, 429 with `Retry-After`, and 5xx behavior in the contract. Choose a consistent foreign-resource 404 policy where existence should not be disclosed; use 403 for an authenticated caller missing an operation scope. Never return database errors or secrets in public messages.

On integration credential-management requests, use `http.MaxBytesReader`, strict decoding, and a second decode expecting EOF. Independently cap query length, filter count, page size, history range, response size, and concurrent expensive operations. Add configurable per-credential and tenant budgets with clear single-server versus multi-replica semantics; do not advertise a cluster-wide quota from an in-process limiter. Propagate `r.Context()` and query deadlines through all new handlers/storage calls. Keep existing authentication abuse controls, but do not substitute them for normal API throughput limits.

### Error and request-budget acceptance tests and rollout

Test oversized bodies including a valid JSON prefix followed by excess bytes, malformed/trailing JSON, unsupported methods, excessive filters, deadline expiry, cancelled clients, and sustained valid-credential load. Require stable error codes, correlation IDs, redacted logs, bounded work, and correct `Retry-After`. Enforce the new contract on new routes first; migrating old UI error shapes is separate work. Set conservative configurable defaults, publish them with the preview contract, and tune using load tests rather than unexplained global throttling that could interrupt agent traffic.

## P1: Own and generate the contract in the program repository

### Contract ownership and CI evidence

At the reviewed program revision, the tracked-file inventory contains no OpenAPI/Swagger contract or dedicated SDK generation surface. [Program CI](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/.github/workflows/ci.yml#L97-L140) runs server lint/unit tests and PostgreSQL storage integration tests; that is valuable, but not an HTTP specification drift gate. The [mock HTTP API tests](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/tests/http_api_test.go#L12-L87) construct their own server behavior, so they cannot verify the program's actual registration handler. The [Docker device-list test](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/tests/e2e_docker_test.go#L122-L153) checks authentication/retrieval but not a two-tenant isolation matrix. These tests should not be presented as proof of a generated external contract.

### Contract-generation components

Add a canonical integration OpenAPI definition and pinned generation toolchain to the program repository. A practical first approach is design-first OpenAPI generating DTOs and operation registration interfaces, with business logic retained in hand-written handlers. It is not necessary to convert the large existing server handler collection to generated code. Make the relationship between generated registration and handwritten authorization explicit.

Extend program CI to validate/lint the specification, regenerate deterministically and require a clean diff, check operation IDs and route coverage, test breaking changes against the released contract, and validate real HTTP request/response fixtures against schemas. Include the error envelope, security scheme, filters, limits, pagination semantics, and negative cases. Generated code alone cannot prove the middleware enforces scopes or tenant isolation; run the P0 matrix through the production mux stack.

Publish a versioned release artifact with source SHA, contract version, and digest. The docs repository should consume that artifact at a pinned version and render it without maintaining a competing canonical contract. Existing source-reviewed documentation can remain explicitly labeled as a snapshot of legacy endpoints. Do not use the program version number as a substitute for an independently stated API compatibility policy.

### Contract acceptance tests and rollout

Require CI failures for an unregenerated DTO/schema change, an undocumented registered integration operation, an implementation response violating the schema, and a breaking change without the required version/deprecation action. Confirm examples and generated clients compile against the release artifact. Verify documentation imports exactly the intended digest/source SHA. Introduce generation and validation in the inventory preview PR, before committing to stability; add operation coverage incrementally rather than pretending every UI/agent route is covered.

## P2: Evolve existing webhooks into durable, signed delivery

### Webhook evidence

Webhooks are already implemented. [Notifier setup and dispatch](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/alerts/notifier.go#L157-L324) use an HTTP client with a default 30-second timeout, default `MaxRetries=3`, a five-second retry delay, and in-memory channel/alert notification tracking. [Webhook payload creation](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/alerts/notifier.go#L471-L508) supports caller-configured headers and alert/tenant fields, but no built-in delivery ID, timestamp signature, or secret rotation protocol. [The HTTP loop](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/alerts/notifier.go#L654-L699) performs up to `MaxRetries` total attempts, retries non-2xx responses with fixed `time.Sleep`, and discards the response body without a byte cap. The inspected notifier does not persist individual pending deliveries, retry times, or delivery outcomes. Alert-level notification counters are not a durable delivery queue.

There are existing outbound safeguards: [URL and address validation](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/alerts/notifier.go#L23-L119) accepts HTTP/HTTPS and rejects resolved private/internal targets. However, DNS lookup failure is allowed, address validation happens before the HTTP connection, and the default client above has no custom redirect policy or pinned validated dialer. These are hardening targets for DNS changes and redirects, **not a reproduced SSRF exploit**. [Notifier tests](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/alerts/notifier_test.go#L14-L137) globally allow local webhook targets and test successful sending; that fixture does not test production destination restrictions. Also, [scheduled report notifications](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/reports/scheduler.go#L230-L247) remain a TODO. Do not equate alert webhooks with implemented report-result delivery.

### Webhook delivery components

First harden the outbound transport in the alert notifier: require HTTPS by default for new integration subscriptions, reject invalid/ambiguous destinations, fail closed on unresolved DNS, validate all resolved addresses, and dial a validated address while preserving TLS hostname verification. Disable redirects initially, or revalidate every redirect hop if a later requirement justifies them. Block loopback, private, link-local, unspecified, multicast, mapped-address equivalents, and metadata destinations; account for proxy configuration rather than letting an environment proxy bypass the policy. Use an injected resolver/dialer for tests instead of a process-global security bypass. An explicit administrator-controlled private-destination policy can be considered separately for legitimate on-premises receivers.

Then add database-backed delivery records with event ID, subscription ID, tenant, immutable payload bytes, attempt count, next attempt time, lease, last result, and terminal/dead-letter state. Enqueue transactionally with the event where practical; where the event transition is not yet transactional, document and test the remaining enqueue-loss window rather than claiming an outbox guarantee. Use bounded worker concurrency, restart recovery, lease recovery, retention, redacted diagnostics, and audited manual replay. Promise at-least-once delivery, not exactly-once processing; receivers deduplicate a stable event/delivery ID.

Add a versioned event envelope and HMAC-SHA256 over a documented timestamp, delivery identifier, and exact body bytes. Send a per-attempt timestamp, key ID, and signature; show receiver-side constant-time verification and a replay window. Outbound signing secrets must be recoverable to sign, unlike hashed inbound API credentials: protect them with controlled storage/encryption and key management, never pretend hashing is sufficient. Support overlapping signing keys for rotation.

Retry transient network failures, 408/429, and 5xx using capped exponential backoff with jitter and bounded `Retry-After`. Define non-retryable 4xx outcomes, maximum age/attempts, and response-body limits. Wait with cancellable timers rather than sleeping after cancellation or a final attempt. Verify subscription ownership and event tenant before queueing or replaying.

### Webhook acceptance tests and rollout

Use fake time and injected networking to test timeout, cancellation, 429 with `Retry-After`, transient failure then success, permanent 4xx, capped response bodies, restart recovery, expired leases, duplicate delivery, dead-letter/replay, revocation/disabled subscriptions, and tenant isolation. Test exact-byte signatures, stale/tampered payloads, key overlap, redirects to blocked addresses, mixed public/private DNS answers, rebinding between validation and connection, IPv4-mapped IPv6, and DNS failures with production policy enabled.

Deliver transport hardening and durable delivery in separate PRs after read-only inventory is usable. Preserve existing alert payloads for existing channels initially; opt new subscriptions into a versioned signed envelope and provide a migration window. Stricter destination policy must be documented for existing HTTP/private receivers. Do not advertise reliable general event subscriptions or report-delivery webhooks until those implementations and tests exist.

## P2: Ship tested SDK and export examples, not a new reporting platform

### Export evidence

CSV/JSON reporting already exists in [the formatter](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/reports/formatter.go#L22-L96). [Formatter tests](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/reports/formatter_test.go#L8-L182) cover CSV rows, empty summary output, special characters, toner-column expansion, and JSON. [Report downloads](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/api_reports.go#L483-L547) serve stored output with content type/disposition. These are real components to reuse after ownership authorization, not evidence that no exports exist or that report administration is safe for service credentials today.

### Client and export components

Add program-owned example clients for HTTPS inventory retrieval, cursor traversal, bounded metrics, and CSV/JSON Lines export. Start with a small Python example and a TypeScript example or one generated client chosen for actual consumers; do not commit to a multi-language SDK maintenance burden immediately. Generate typed models from the canonical specification and add a thin tested wrapper for pagination and errors only when needed.

Read credentials from environment/configuration without logging them; verify TLS by default. Examples should honor `Retry-After`, bound retries/timeouts, stop on 401/403, stream pages to disk, and explain freshness and non-snapshot paging. Include tenant/agent identifiers and timestamp units in exports. For spreadsheet-targeted CSV, explicitly test/mitigate formula-leading cells; correct CSV quoting alone is not a spreadsheet safety policy. Prefer client-side export over a new bulk-export job API in the first release. Do not create reports or reuse session-login scripts merely to fetch inventory.

### Client and export acceptance tests and rollout

Run examples against the real integration test server with two tenants, multiple pages, an empty fleet, UTF-8, quotes/newlines, missing metrics, a rate limit, and expired/revoked credentials. Validate no credential leakage, no infinite retries, correct cursor termination, stable columns, timezone/counter units, and spreadsheet-safe output. Include generated-client compilation in program CI. Ship examples with the preview contract and update them with every contract release; publish a separately versioned SDK only after an actual consumer validates the workflow. Keep existing UI/report exports unchanged.

## Phased, PR-sized implementation plan

The sequence below describes reviewable slices, not a single large rewrite. Each PR should include its tests and a compatibility note; no PR should announce later phases as implemented.

| Phase / PR | Bounded deliverable | Exit condition |
| --- | --- | --- |
| 0 / 1 | Empty-agent device-list regression and explicit restricted-query behavior in both existing branches. | Zero scoped agents returns zero rows/counts; administrator behavior and response shapes remain covered. |
| 0 / 2 | Tenant-read matrix for alerts/report lists and downloads, with caller-derived scope corrections. | Foreign/omitted scopes cannot broaden reads; each tightened legacy route has tests and migration notes. Split alerts and reports further if necessary. |
| 0 / 3 | Exact report tenant membership and identity/ownership design fixtures. | Substring/wildcard cases fail to match; both database upgrades are tested. Historical metrics stays deferred if identity needs a larger migration. |
| 1 / 4 | Service-credential storage and authenticated create/list/revoke lifecycle. | One-time secret, hash storage, expiry, audit redaction, revocation, and both dialects pass. No new fleet route is exposed yet. |
| 1 / 5 | Scope-aware credential middleware and integration error/budget primitives. | Token-kind separation, fail-closed authorization, cancellation, 413/429/error schemas pass. |
| 2 / 6 | Integration inventory API with dedicated DTOs, filters, deterministic pagination, and canonical generated contract. | Real-mux tenant matrix, query budgets, schema conformance, and generated-diff CI pass; preview is explicitly labeled. |
| 2 / 7 | Tested inventory export/client examples and versioned contract artifact publication. | A consumer can export multiple pages without user login or privileged agent credentials. This is the first useful read-only milestone. |
| 3 / 8 | Ownership-qualified, bounded metrics API, only after identity gates. | Database-side interval/row limits, reassignment fixtures, and contract tests pass. |
| 4 / 9 | Webhook transport hardening with production-policy resolver/dialer tests. | Redirect/DNS/address cases, cancellation, and response limits pass; existing-channel migration is documented. |
| 4 / 10 | Durable delivery worker and retry/dead-letter state. | Restart/lease/retry tests establish the stated at-least-once behavior. |
| 4 / 11 | Versioned signed event subscriptions, rotation, receiver examples, and replay controls. | Signature/replay and tenant ownership tests pass before reliability is advertised. |

Contract drift tests belong in the inventory PR and subsequent operation PRs, not in a distant documentation cleanup. A release candidate should also run the full server suite and PostgreSQL integration suite; selected tests used for this research are only a baseline. The documentation site can then import the published artifact in a separate repository change. This roadmap itself does not perform any of those implementation or import changes.

## Deliberate deferrals

- **Write APIs and remote execution:** Agent restart/update, discovery commands, device/agent deletion, settings writes, tenant/user administration, onboarding, and arbitrary proxies are excluded from initial service scopes. Require a separate authorization, audit, idempotency, and operational-safety design before exposing them.
- **Broad alert/report support:** Do not stabilize these merely by listing existing routes in OpenAPI. Ownership and tenant-read regressions come first; report generation is not a read-only operation.
- **Existing agent credential migration:** Hashing/rotating agent tokens deserves its own agent/server compatibility plan. It is not the mechanism for third-party service authentication.
- **Serial identity overhaul:** Composite device identity, ownership history, and backfills may exceed one PR. If so, ship inventory first and defer historical metrics rather than promise unsupported isolation.
- **OAuth client credentials, marketplace integrations, and many SDKs:** Start with named opaque service credentials and tested examples. Add standards-based federation or PSA/RMM-specific adapters only when deployment requirements justify their complexity.
- **Snapshot exports and asynchronous bulk jobs:** Initial clients consume bounded pages with documented live-data semantics. Snapshot guarantees need explicit database/job support.
- **All-event streaming, exactly-once webhooks, and scheduled report delivery:** Existing alert notifications do not provide these guarantees. Expand event coverage only after the durable/signing foundations; report delivery remains separate work.
- **A wholesale rewrite of legacy APIs:** Preserve browser and agent compatibility while publishing a deliberately small, tested integration surface. Source pinning and a rendered specification are documentation tools, not substitutes for implementation and regression tests.
