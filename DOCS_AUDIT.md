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
