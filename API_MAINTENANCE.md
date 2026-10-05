# Maintaining the public OpenAPI reference

Server reference: `/api/openapi/`, contract `/openapi/server.yaml` (17 operations). Agent reference: `/api/agent/`, contract `/openapi/agent.yaml` (7 operations). `/api/protocol/` explains machine communication but is not a complete payload specification. These work on GitHub Pages and Docker as static assets; publishing them does not implement endpoints or change authentication.

## Add or revise an operation

1. Read the actual route registration, handler, authorization wrapper, and serialized Go types in the program repository. Do not copy unverified old documentation.
2. Edit the appropriate contract: `static/openapi/server.yaml` or `static/openapi/agent.yaml`. Record method/path, query parameters, response shapes, error statuses/content types, and actual security requirements. Server user sessions, Agent cookies, and machine tokens are separate credential classes. Document missing authorization/filtering checks rather than implying they exist.
3. Record `x-reviewed-commit` and each operation's `x-source` path/handler against the actual containing program revision. The latest inventory review is pinned to `bdf1f8fea22e91d490238d9ab266f2690070c82d`: new index, rows and metrics/query operations plus changed legacy devices/list each carry that `x-source.commit`. Other operations retain the `864fc3ee040bbb28f25d779c69512c5b6999d421` hardening review, explicitly recorded in `x-review-notes`; changing the top-level SHA does not imply a whole-API audit. Never confuse a source revision with a released binary. The OpenAPI `info.version` tracks the contract, not the binary version. Server 0.3.0 expands coverage from 14 to 17 operations without removing earlier operations; legacy envelopes, URL namespace and machine protocol remain unchanged. Update explicit coverage and exact projection regressions when adding operations, and semantics regressions when correcting existing operations. Static provenance checks are not live handler contract tests.
4. Run validation and build checks:

   ```bash
   npm ci --ignore-scripts
   npm run vendor:api
   npm test
   hugo --gc --minify --panicOnWarning --cleanDestinationDir
   npm run check
   docker build -t printmaster-docs:local .
   bash scripts/smoke.sh printmaster-docs:local
   ```

5. Open `/api/openapi/` and confirm the operation renders. Push after review; the existing CI and enabled Pages deployment publish the same generated site.

## Progressive inventory review scope

The paired backend slice is `bdf1f8fea22e91d490238d9ab266f2690070c82d`. Review `server/inventory_api.go`, `server/storage/inventory.go`, route registration and `handleDevicesList` in `server/main.go`, `server/storage/types.go`, and embedded device tags in `common/storage/types.go`. The three additions are **GET index**, **POST rows**, and **POST metrics/query** under `/api/v1/devices/`; there is no separate `/api/v1/devices/query` operation. All use Server user sessions, not machine tokens. The legacy devices/list route remains GET, with SQL-scoped counts/rows and best-effort owner-matched metrics enrichment.

Contract tests pin exact index/row/lazy-metric field sets, non-null arrays, distinct-key rather than raw-array limits, projection ID/omission semantics, source provenance and editorial counts. Preserve the generic historical snapshot schema separately from the exact latest-inventory projection. Runtime negative auth/tenant cases and SQLite/PostgreSQL query-plan tests remain mandatory; static YAML validity does not prove them. The [tenant-isolation validation record](content/guides/tenant-isolation.md#required-implementation-validation) records this slice's executed checks and remaining gates.

The viewer uses locally installed Swagger UI assets and a lockfile; no public CDN or external schema validator receives the spec. npm lifecycle scripts are disabled in Docker/CI. Application runtime remains static Nginx or GitHub Pages; Node is build tooling only.

## Documentation versus a stable public product API

This pass documents existing server routes. To offer a separately supported public API, implement that contract in the **program repository**, decide versioning/deprecation guarantees, select an appropriate automation credential model, add handler/authorization contract tests, and validate tenant isolation. Do not simply declare current internal/UI routes permanently stable.

Concrete implementation proposals, source modules, acceptance tests, and compatible PR-sized rollout are in `content/development/public-api-roadmap.md`. Pending fixes and remaining tenant/history/proxy/callback validation gates are summarized in `content/guides/tenant-isolation.md`; do not leave fixed baseline caveats labeled current. Protocol OpenAPI and WebSocket AsyncAPI remain separate follow-ups.

Try-it-out stays disabled on the public reference. Use a local API client against your HTTPS server; never paste production credentials into a hosted documentation page. Enabling cross-origin browser execution later needs a deliberate CORS/auth/CSRF review in the server, not just a UI toggle.
