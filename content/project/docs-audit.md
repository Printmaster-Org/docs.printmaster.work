---
title: "Targeted Documentation Accuracy Audit"
description: "Verified operational corrections, source evidence, and explicitly nonexhaustive review boundaries."
weight: 60
---

Reviewed PrintMaster source snapshot: **`565f4c0`** (`565f4c0762e467f083f54a9e0e7f6bc23ada56c3`), on **2026-10-02**. This page summarizes the [repository audit record](https://github.com/Printmaster-Org/docs.printmaster.work/blob/main/DOCS_AUDIT.md).

This was a **targeted, source-based operational accuracy pass**, not an exhaustive documentation or security audit, nor a live deployment certification. Subsequent contract reviews cover 14 Server operations and seven independent Agent reads; other operations remain outside scope. Imported `source`/`sourceCommit` metadata records provenance, not proof of accuracy. Runtime code at the reviewed snapshot took precedence over stale README, example, and template comments.

## Reviewed Scope

The original pass corrected [configuration](/guides/configuration/), [installation](/guides/install/), [features](/guides/features/), [Docker deployment](/deployment/docker/), [server overview](/components/server/), [historical security architecture](/development/security-architecture/), and [WebSocket proxy notes](/development/websocket-proxy/). Existing headings were retained for linked-anchor compatibility. The historical security design is explicitly legacy; its planned controls and examples must not be read as shipped behavior.

## Verified Operational Findings

All source links below are pinned to the reviewed **PrintMaster program** commit, not the documentation repository.

- **CLI:** Removed unsupported `-port`, `-data-dir`, `-log-level`, and old overview `-db` examples; documented supported configuration, generation, service, output, health, and version flags. Evidence: [agent flags](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/agent/main.go), [server flags](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/server/main.go).
- **Server config and stores:** TOML uses `[server]`, not `[web]`; database settings use `driver`/`dsn`, not `type`/`postgres_url`. Implemented stores are SQLite and PostgreSQL. `[logging].file` is unsupported. Evidence: [server config](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/server/config.go), [common config](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/common/config/config.go), [store](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/server/storage/store.go).
- **Server listeners/TLS:** Standalone defaults to HTTPS 9443. HTTP 9090 requires `BEHIND_PROXY=true`, `PROXY_USE_HTTPS=false`; true selects HTTPS upstream. TLS modes are `self-signed`, `letsencrypt`, and `custom`, with minimum TLS 1.2. Evidence: [listeners](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/server/main.go), [TLS](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/server/tls.go).
- **Server image identity:** Alpine 3.21 with shell/tooling and default `PUID=0`/`PGID=0`, ownership setup, and optional `su-exec` privilege drop; not a distroless UID-65532 image. Evidence: [Dockerfile](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/server/Dockerfile), [entrypoint](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/server/docker-entrypoint.sh).
- **Bootstrap user:** Startup creates the configured username only if absent; it does not reset an existing user's password or role. Evidence: [bootstrap implementation](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/server/main.go#L800-L823).
- **Agent local auth:** Protected routes do not admit every remote client. Loopback bypass requires allow-local-admin; forwarding headers affect the current detector, so direct access and proxy headers must be controlled. Evidence: [agent auth](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/agent/main.go), [agent config](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/agent/config.go).
- **Agent web listeners:** Runtime unified/UI defaults are HTTP 8080 and HTTPS 8443. Legacy TOML `enable_tls` is not the runtime switch; unsupported certificate fields were removed from examples. Evidence: [agent runtime](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/agent/main.go), [settings defaults](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/common/settings/defaults.go), [settings types](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/common/settings/types.go).
- **Alerts:** Seeded toner warning is at or below 20%; critical is at or below 5%. Supply rules evaluate toner levels, not dedicated drum, fuser, waste-toner, or paper-out thresholds. Evidence: [seeded rules](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/server/storage/base_alerts.go), [evaluator](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/server/alerts/evaluator.go).
- **Proxy transport:** WebSocket dispatch invokes local handlers directly. Printer proxy supports HTTP/HTTPS and selected streaming paths; ordinary paths still buffer and use default timeouts. Evidence: [server proxy](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/server/main.go), [agent WS client](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/agent/agent/ws_client.go), [printer proxy](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/agent/main.go).
- **TLS trust:** The HTTP client's custom CA pool is not propagated to WSS. Printer HTTPS can skip certificate verification. WebSocket transport is encrypted only with WSS. Evidence: [HTTP client](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/agent/agent/server_client.go), [WSS client](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/agent/agent/ws_client.go), [printer transport](https://github.com/Printmaster-Org/printmaster/blob/565f4c0762e467f083f54a9e0e7f6bc23ada56c3/agent/main.go).

## Validation Boundaries

### Committed hardening review, 2026-10-02

Server contract **0.2.1** and [tenant isolation](/guides/tenant-isolation/) review [committed source revision 864fc3e](https://github.com/Printmaster-Org/printmaster/tree/864fc3ee040bbb28f25d779c69512c5b6999d421), containing the storage, tenant API, Server and Agent security slices and regression tests. This is not a released build identifier. Contract `x-review-notes` records the containing revision; per-operation source metadata is retained. The independent Agent contract remains unchanged at its earlier reviewed revision.

Earlier caveats about empty-agent device-list widening, absent alert/report caller scope and substring report membership are fixed in that committed revision. Reviewed docs now describe scoped totals/pages/summaries, owned report execution/results, HTTP machine identity, atomic storage ownership, explicit bound callbacks, event subscriber checks and proxy credential stripping. Routes/protocol versions and coverage counts are unchanged; stricter auth can deny legacy unsafe requests. See [machine ownership](/api/machine-ownership/) and [authentication boundaries](/guides/authentication-boundaries/).

Final reconciliation confirms OIDC role normalization preserves `viewer`, defaults omitted/empty roles to `viewer`, maps legacy `user` to `operator`, and rejects unknown roles. Password/OIDC login JS and the shared callback-target helper now bind issuance to the stored authorized Agent; OIDC retains the target in state-bound redirect data. Device-code approval serializes token issuance/state mutation; pending-registration approval commits review and token in one SQLite/PostgreSQL transaction. Earlier unbound-redirect and nontransactional pending-review caveats are superseded. Device-code state remains in-memory, with restart/process-crash limits; lost approval responses and historical stranded rows still need administrator recovery.

User-session device deletion now returns plain-text `409` (`Device ownership changed`) for atomic owner conflicts, protecting replacement device/credentials/metrics. Optional Agent deletion happens before the Server transaction and is not rolled back by this conflict. Report-run lists omit `result_data`; authorized detail/download retains result bodies and existing formatting. These routes remain outside the reviewed read-only OpenAPI subset, not newly covered operations or machine-protocol changes.

Remaining limits include serial-only historical metrics/enrichment, Agent external proxy-header/forwarding trust, broad candidate reads, existing Agent-session revocation, external-IdP/live-browser validation and unaudited routes. Committed regression sources were inspected; this docs-only update does not rerun or certify runtime tests. Full Agent/Server, race, both DB dialects and real-route negative authorization/contract tests remain release requirements. Docs validation results belong to the current change report; historical counts below are not reused as current proof. The containing source SHA is recorded above; no released hardening build is claimed.

The original audit record reports 11 passing docs unit tests, a pinned Hugo 0.150.1 Docker build with `--gc --minify --panicOnWarning`, and a generated-site check of 52 HTML pages and 50 search entries with local links/assets/anchors passing. These are historical results for that pass, not current page counts or evidence of runtime correctness. No live printer, agent, or server deployment was exercised.

The original operational pass did **not** review API pages or contracts. The separately documented [server API subset](/api/openapi/) now covers 14 existing operations; [download its YAML](/openapi/server.yaml). The Agent subset covers seven local reads. This limited coverage does not audit the remaining API surface or establish a broad stable API guarantee.

## Remaining Work — Explicitly Nonexhaustive

- Audit API routes beyond the 14-Server/seven-Agent subsets and retained feature-guide request examples; complete remaining runtime gates above.
- Review getting started, troubleshooting, updates, discovery, and other untouched guides.
- Correct known stale Unraid proxy/environment examples; review database upgrades and other deployment guidance.
- Check agent component roadmap claims, logger/module overviews, project security examples, and other roadmap/release/development designs.
- Perform a protocol-level review of historical proxy message examples and function inventories.
- Verify package URLs, published image architectures/tags, UI navigation labels, metric retention, schedules/groups, and performance figures; these were not exhaustively checked.
- Review migration records, imported source docs, templates, and package/release/installer configuration separately; none was certified by the operational pass.

Do not infer that untouched pages, or every paragraph of a corrected page, are accurate from this record. Recheck source behavior when upgrading beyond `565f4c0`.

## Report query-scope performance follow-up, 2026-10-03

Program source commit [`4fef992`](https://github.com/Printmaster-Org/printmaster/commit/4fef9920109e30c691589531dc143311bbe4b785) moves tenant-scoped report reads for agents, devices, tenants, sites, and alerts into exact storage predicates. Site membership now uses a single SQL query with `EXISTS` rather than per-agent site lookups; site inventory fetches selected sites in one batch. Empty tenant scopes remain empty. SQLite and PostgreSQL tests cover cross-tenant and mismatched site cases.

No HTTP behavior, OpenAPI coverage, route, product, or protocol version changed. Generated report data and alert histories still materialize in memory; per-device metric retrieval and historical ownership limitations remain. Program validation: full Server tests passed; PostgreSQL report-security integration tests passed with the `integration` build tag. This follow-up is not a release or runtime certification.
