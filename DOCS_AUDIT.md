# Targeted documentation accuracy pass

Reviewed source snapshot: `565f4c0762e467f083f54a9e0e7f6bc23ada56c3` (`565f4c0`) in the PrintMaster source checkout. Review date: 2026-10-02.

This is a **scoped, source-based accuracy pass**, not an exhaustive documentation audit, security audit, API contract validation, or live deployment certification. Imported `source`/`sourceCommit` metadata remains provenance; corrections were checked against the same snapshot.

## Edited scope

- `content/guides/configuration.md`
- `content/guides/install.md`
- `content/guides/features.md`
- `content/deployment/docker.md`
- `content/components/server/_index.md`
- `content/development/security-architecture.md`
- `content/development/websocket-proxy.md`

No API pages/specifications, templates, package files, source-code files, or other content pages were changed. Existing headings were retained, including historical server schema/INI headings, to preserve linked anchors. The historical security design is marked `legacy: true` and warns that its controls/examples are planned, not shipped as specified.

## Evidence and corrected claims

Source paths below refer to the PrintMaster repository at the reviewed commit, not files in this docs repository. Runtime code takes precedence over stale source README/example/template comments.

| Area | Source evidence | Result |
|------|-----------------|--------|
| CLI | `agent/main.go` flags (2387 onward); `server/main.go` (406 onward) | Removed unsupported `-port`, `-data-dir`, `-log-level`, old overview `-db`; documented supported config/generation/service/output/health/version flags |
| Server TOML/DB | `server/config.go` structs/defaults/env loader; `common/config/config.go` DB/logging config/env helpers; `server/storage/store.go` | `[server]`, not `[web]`; `driver`/`dsn`, not `type`/`postgres_url`; implemented server stores SQLite/PostgreSQL; unsupported `[logging].file` removed |
| Listeners/TLS | `server/main.go` `startStandaloneMode`/`startReverseProxyMode`; `server/tls.go` | Default standalone HTTPS 9443; HTTP 9090 requires `BEHIND_PROXY=true`, `PROXY_USE_HTTPS=false`; true selects encrypted upstream; modes `self-signed`, `letsencrypt`, `custom`; minimum TLS 1.2 |
| Image identity | `server/Dockerfile` runtime/ENV; `server/docker-entrypoint.sh` | Alpine 3.21, shell/tooling, image `PUID=0`/`PGID=0`; ownership setup/optional `su-exec` privilege drop, not distroless UID 65532 |
| Bootstrap | `server/main.go` (800–823) lookup/conditional `CreateUser` | Runs at startup, creates absent username only; never resets existing password/role |
| Agent local auth | `agent/main.go` `authenticate`/`requestIsLoopback`; `agent/config.go` | Protected routes do not admit every remote client; loopback bypass requires allow-local-admin; forwarding-header caveat documented |
| Agent runtime web | `agent/main.go` listener setup; `common/settings/defaults.go`/`types.go` | Unified/UI HTTP 8080/HTTPS 8443 defaults; legacy TOML `enable_tls` is not runtime switch; unsupported cert fields removed |
| Alerts | `server/storage/base_alerts.go` seeded rules (1405–1426); `server/alerts/evaluator.go` device-rule switch (582–612) | Toner warning at or below 20%, critical at or below 5% (inclusive evaluator comparisons); supply rules evaluate toner levels, not dedicated drum/fuser/waste-toner/paper-out thresholds |
| Proxy transport | `server/main.go` agent/device proxy; `agent/agent/ws_client.go` local/streaming dispatch; `agent/main.go` device proxy | Direct local-handler invocation; HTTP/HTTPS printer support, selected streaming; ordinary paths buffer/use default timeouts |
| TLS trust | `agent/agent/server_client.go` HTTP TLS setup; `agent/agent/ws_client.go` WSS dial; `agent/main.go` printer transport | HTTP custom CA pool not propagated to WSS; printer HTTPS can skip verification; WS encrypted only with WSS |

## Validation and boundaries

- Docs unit tests: 11 passed.
- Fresh pinned Hugo 0.150.1 Docker build with `--gc --minify --panicOnWarning`: passed.
- Generated-site checker: 52 HTML pages, 50 search entries; all local links/assets/anchors passed.
- Whitespace/diff scope and original heading preservation checked separately.

These checks validate rendering and links, not runtime deployment behavior. No live printer/agent/server deployment was exercised. Generated output stays outside the tracked docs worktree. Existing Markdown style diagnostics (including repeated headings and table formatting) are not treated as runtime accuracy failures; original headings remain for compatibility.

## Remaining unaudited documentation

All other pages remain outside this pass, including:

- API pages/contracts/specifications; retained feature-guide request examples were not contract-audited
- Getting started, troubleshooting, updates, discovery, and other guides
- Unraid, database upgrades, and other deployment guides
- Agent/logger and other component/module overviews
- Project security/roadmap/release planning and other development designs
- Migration records, imported source docs, templates, package/release/installer config

Known out-of-scope follow-ups: stale Unraid proxy/env examples, agent component roadmap claims, project security examples. Package URLs, published image architectures/tags, all UI navigation labels, metric retention, schedules/groups, and performance figures were not exhaustively verified. Historical proxy message examples/function inventories need a separate protocol-level review.

Do not infer that untouched pages, or every paragraph of an edited page, are accurate from this record.

## API follow-up in this pass

The obsolete API overview was replaced after verifying server routing, user-session authentication, handler query parsing, and response shapes. A public OpenAPI 3.0.3 reference now covers five operations: local login, current user, logout, agent listing, and device listing. These were reviewed against the same snapshot, including pagination envelopes versus legacy arrays, plain-text errors, and user-session bearer/cookie alternatives. This is not a complete API inventory, a new API service, or a compatibility guarantee for existing UI endpoints.

Final integrated validation: 13 tests, OpenAPI schema validation, Docker/Hugo build and hardened-runtime smoke tests, plus generated local-link/anchor checks. Original source documents remain unchanged. Other endpoint contracts still need individual review before inclusion.

## Read-only expansion at eeb6259

Server contract now covers 14 operations, including metrics history/bounds, alerts, reports, tenants, and sites. Agent contract covers seven local reads, with a separate cookie security model. All operations have source-handler metadata pinned to `eeb6259f6060c0534798e3d14ac0cd9d289df9a7`; this refresh does not re-audit every operator guide against that revision.

At that historical revision the expansion recorded ignored filters/history bounds, null collections, inconsistent role/tenant checks and empty-scope device filtering. Those descriptions are historical, not the current committed implementation. Documenting an endpoint is not endorsing it as safe for untrusted multi-tenant automation. Machine payload contracts and WebSocket AsyncAPI remain pending; the protocol page is a route/auth boundary overview only.

## Committed security-hardening refresh, 2026-10-02

Reviewed committed source and regression files at `864fc3ee040bbb28f25d779c69512c5b6999d421`. This revision contains the storage/report ownership (`b2e7d3970031ec24d282e2bf3466fe1da1ea62b7`), alert/settings scope (`431ed7c31f8416a41e0e2383a18e849a36201cf3`), Server identity/channels (`bdd4c4fa1e4c401aa471185b271a94040a4955f1`), and Agent authentication (`864fc3ee040bbb28f25d779c69512c5b6999d421`) slices. Server contract `x-reviewed-commit` records the containing revision; `x-review-notes` distinguishes source provenance from release status. `info.version` advances 0.2.0 → 0.2.1 as a documentation correction patch, not a route/product/protocol bump. Coverage remains 14 Server operations; the seven-operation Agent contract is unchanged.

Updated Server auth/tenant semantics, visible pagination/totals/empty responses and error content types; API index/reference and Server overview; machine ownership, authentication boundaries and protocol overview; canonical tenant-isolation guide; roadmap P0 status; this record and published audit; maintenance/README; contract regression tests. Existing operation IDs, refs and page headings/anchors are retained.

Committed code fixes empty-agent inventory widening, caller-scoped alert/report visibility, exact report membership, immutable run ownership/generator restrictions, authenticated machine writes, atomic machine/review guards, explicit callback ownership, event subscriber filtering and proxy credential stripping. Historical unmarked runs stay admin-only. Stricter access can deny previously accepted unsafe requests without route/protocol changes.

Final reconciliation against the committed revision confirms OIDC payload role normalization (`viewer` preserved; omitted/empty role → `viewer`; legacy `user` → `operator`; invalid role → `400`), shared callback-target reconciliation, real password/OIDC login-JS target propagation, state-bound OIDC target issuance, serialized device-code approval/token issuance, and transactional pending-registration approval in `server/storage/pending_approval.go`. Earlier unbound-redirect and nontransactional pending-review caveats are superseded, not current limitations. Device-code state remains in-memory and is not a DB transaction: restart/process-crash and lost-response recovery limits remain documented.

User-session device deletion now maps atomic owner conflicts to plain-text `409` (`Device ownership changed`), preserving replacement device/credentials/metrics; optional Agent deletion occurs before the Server transaction and is not rolled back. Report-run listings omit `result_data` through metadata-only SQL reads; authorized detail/download retains the body and existing download formatting. These operations remain outside the 14-operation read-only Server contract; no coverage, route, product or machine-protocol version bump is implied.

Remaining limits and required implementation tests are canonical in `content/guides/tenant-isolation.md`: serial-only history/enrichment needs identity fixtures, Agent proxy-header/forwarding trust is unchanged, broad candidate filtering remains, existing Agent sessions are not continuously revalidated, and external-IdP/live-browser and both-dialect runtime gates remain. Static spec/site checks cannot establish runtime isolation; no program tests were run by this docs-only pass. Current npm/Docker/Hugo/smoke results are reported with the change, not inferred from historical audit counts. This documentation update makes no runtime changes; it records the actual containing source SHA without claiming a released build.
