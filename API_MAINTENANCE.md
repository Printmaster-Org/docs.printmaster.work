# Maintaining the public OpenAPI reference

The public page is `/api/openapi/`; the downloadable contract is `/openapi/server.yaml`. Both work on GitHub Pages and Docker because they are static assets. Publishing them does not implement new endpoints or change authentication on PrintMaster servers.

## Add or revise an operation

1. Read the actual route registration, handler, authorization wrapper, and serialized Go types in the program repository. Do not copy unverified old documentation.
2. Edit `static/openapi/server.yaml`: record method/path, query parameters, required body fields, response shapes, HTTP error statuses/content types, and security requirements. Use user-session authentication only where the route actually uses it; agent tokens are a separate credential class.
3. Record the reviewed program commit in the spec description and audit notes. The OpenAPI `info.version` tracks this contract, not the binary version. Initial coverage is deliberately limited to five reviewed operations; update the coverage regression test when adding more.
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

Try-it-out stays disabled on the public reference. Use a local API client against your HTTPS server; never paste production credentials into a hosted documentation page. Enabling cross-origin browser execution later needs a deliberate CORS/auth/CSRF review in the server, not just a UI toggle.
