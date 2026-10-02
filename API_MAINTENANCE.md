# Maintaining the public OpenAPI reference

Server reference: `/api/openapi/`, contract `/openapi/server.yaml` (14 operations). Agent reference: `/api/agent/`, contract `/openapi/agent.yaml` (7 operations). `/api/protocol/` explains machine communication but is not a complete payload specification. These work on GitHub Pages and Docker as static assets; publishing them does not implement endpoints or change authentication.

## Add or revise an operation

1. Read the actual route registration, handler, authorization wrapper, and serialized Go types in the program repository. Do not copy unverified old documentation.
2. Edit the appropriate contract: `static/openapi/server.yaml` or `static/openapi/agent.yaml`. Record method/path, query parameters, response shapes, error statuses/content types, and actual security requirements. Server user sessions, Agent cookies, and machine tokens are separate credential classes. Document missing authorization/filtering checks rather than implying they exist.
3. Record `x-reviewed-commit` and each operation's `x-source` path/handler. The OpenAPI `info.version` tracks the contract, not the binary version. Update the explicit coverage regression test when adding operations. Static provenance checks are not live handler contract tests.
4. Run validation and build checks:

   ```bash
   npm ci --ignore-scripts
   npm run vendor:api
   npm test
   docker build -t printmaster-docs:local .
   bash scripts/smoke.sh printmaster-docs:local
   ```

5. Open `/api/openapi/` and confirm the operation renders. Push after review; the existing CI and enabled Pages deployment publish the same generated site.

The viewer uses locally installed Swagger UI assets and a lockfile; no public CDN or external schema validator receives the spec. npm lifecycle scripts are disabled in Docker/CI. Application runtime remains static Nginx or GitHub Pages; Node is build tooling only.

## Documentation versus a stable public product API

This pass documents existing server routes. To offer a separately supported public API, implement that contract in the **program repository**, decide versioning/deprecation guarantees, select an appropriate automation credential model, add handler/authorization contract tests, and validate tenant isolation. Do not simply declare current internal/UI routes permanently stable.

Concrete implementation proposals, source modules, acceptance tests, and compatible PR-sized rollout are in `content/development/public-api-roadmap.md`. Address tenant isolation/trusted-proxy findings before expanding multi-tenant automation. Protocol OpenAPI and WebSocket AsyncAPI remain separate follow-ups.

Try-it-out stays disabled on the public reference. Use a local API client against your HTTPS server; never paste production credentials into a hosted documentation page. Enabling cross-origin browser execution later needs a deliberate CORS/auth/CSRF review in the server, not just a UI toggle.
