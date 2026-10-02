# PrintMaster documentation

Hugo documentation for [PrintMaster](https://github.com/Printmaster-Org/printmaster). Target domain: **[docs.printmaster.work](https://docs.printmaster.work/)**.

The local theme uses PrintMaster's Solarized dark/light palette, icon, panels, and borders. It includes responsive navigation, a table of contents, keyboard-accessible controls, and client-side full-text search. No external theme, fonts, CDN, or JavaScript framework is required.

## Choose hosting

Docker is optional: Hugo produces ordinary static HTML/CSS/JS. See [DEPLOYMENT.md](DEPLOYMENT.md) for all activation steps.

**Planned production host: GitHub Pages**, once this repository becomes public. No paid organization plan or Docker server is needed for that public-repository deployment. Keep the Docker image as an optional self-hosting fallback.

| Option | Private repository | Server required | Activation |
| --- | --- | --- | --- |
| GitHub Pages | Organization needs Team/Enterprise; public repos work on Free | No | Enable Pages and opt-in workflow variable |
| Cloudflare Pages | Supported on Free via GitHub integration | No | Connect the repo and configure a Hugo build |
| Docker | Supported; authenticate to private GHCR package | Yes | Deploy the existing image and reverse proxy |

During preparation this repository remains private. GitHub Pages is not enabled yet; make the repository public at launch, configure its Pages custom domain, then set `ENABLE_GITHUB_PAGES=true`. No automation changes repository visibility or hosting settings. The workflow only deploys after successful validation on `main`.

**A private source repository does not make the published website private.** Review documentation before enabling public hosting.

## Run locally

With Node.js 24 and the Hugo version in `.hugo-version` installed, install the locked development dependencies and vendor the API viewer before starting Hugo:

```bash
npm ci --ignore-scripts
npm run vendor:api
hugo server --bind 0.0.0.0 --baseURL http://localhost:1313/
```

Or build and serve the production Docker image:

```bash
docker compose up -d --build
```

Open **[localhost:8088](http://localhost:8088)**. The default canonical URL is the production domain; override it at build time when deploying elsewhere:

```bash
DOCS_BASE_URL=https://docs.example.com/ docker compose build
docker compose up -d
```

`BASE_URL` is a **build argument**, not a runtime setting. Rebuild when changing it. Production deployment should use the domain root, not a subpath.

## Deploy the CI image

Every successful push to `main` publishes:

```text
ghcr.io/printmaster-org/docs.printmaster.work:latest
```

Images support Linux **amd64** and **arm64**. CI also publishes `main`, immutable `sha-<commit>` tags, and semantic version tags for `v*` releases. Pull requests build and test the image but never publish it.

```bash
docker compose pull
docker compose up -d --no-build
```

The container listens on **8080**, runs as UID **101**, needs no data volume, and supports a read-only root filesystem. Compose binds **127.0.0.1:8088** for a host reverse proxy. For a containerized proxy, join a shared Docker network and route to `docs:8080` instead of using the proxy container's localhost.

Point DNS for `docs.printmaster.work` at your host, terminate HTTPS at your reverse proxy, and proxy requests to **[127.0.0.1:8088](http://127.0.0.1:8088)**. `/healthz` is the health endpoint. Unknown pages return HTTP 404, not a single-page-app fallback.

### One-time GitHub setup

- Allow GitHub Actions in this repository and grant workflow package publication if organization policy restricts it.
- After the first successful publication, set the GHCR package visibility to **public** for anonymous pulls; otherwise authenticate Docker to GHCR.
- Configure DNS, TLS, and the deployment host separately. CI builds/publishes the image; it does not access or automatically update your server.

## Edit documentation

Edit Markdown under `content/`; the docs repository is the new editorial home. Use Hugo front matter with a title and root-relative links to the published page URLs. Update navigation weights in section front matter. Keep assets under `static/` and theme code under `assets/` / `layouts/`.

Imported pages retain `source` and `sourceCommit` metadata. Source-code references point to the exact original PrintMaster commit; update them when revising implementation documentation.

```bash
npm ci --ignore-scripts
npm run vendor:api
npm test
hugo --gc --minify --panicOnWarning
npm run check
docker build -t printmaster-docs:local .
bash scripts/smoke.sh printmaster-docs:local
```

Node.js 24 is build/test tooling only, not a runtime dependency. Development dependencies validate OpenAPI and provide Swagger UI assets. `npm run vendor:api` copies the viewer and its licensing locally; the static site uses no CDN or external validator, and request execution is disabled. No Node runtime or `node_modules` is shipped, only static assets. Repeat vendoring after dependency updates and before each Hugo server/build invocation. Docker performs dependency installation and vendoring in its build stage, installs the pinned Hugo release, and verifies its archive checksum. Update `.hugo-version` and the Dockerfile default together when upgrading Hugo.

The [server API overview](https://docs.printmaster.work/api/) links to the 14-operation [OpenAPI reference](https://docs.printmaster.work/api/openapi/) and [downloadable YAML](https://docs.printmaster.work/openapi/server.yaml). The [targeted accuracy audit](https://docs.printmaster.work/project/docs-audit/) records operational corrections, evidence, and remaining unaudited scope; it is not certification of all documentation.

## API documentation and accuracy

Public [Server OpenAPI](https://docs.printmaster.work/api/openapi/) covers 14 operations; [Agent OpenAPI](https://docs.printmaster.work/api/agent/) covers 7 local reads. A [machine-protocol guide](https://docs.printmaster.work/api/protocol/) separates enrollment/upload tokens from user credentials. See [API_MAINTENANCE.md](API_MAINTENANCE.md) for contract maintenance and the [product API roadmap](content/development/public-api-roadmap.md) for concrete program changes. Request execution remains disabled; fleet credentials stay off the hosted page.

Server contract 0.2.1 describes committed hardening at source revision `864fc3ee040bbb28f25d779c69512c5b6999d421`, containing the four linked storage, tenant API, Server and Agent security commits. This source revision is not a released binary identifier. [Tenant isolation](content/guides/tenant-isolation.md) records implementation, stricter-access compatibility, remaining limitations and required runtime tests. Agent contract coverage is unchanged.

See [DOCS_AUDIT.md](DOCS_AUDIT.md) for the targeted accuracy pass, implementation evidence, and remaining unaudited content. A passing static build does not establish product accuracy for every imported document.

Final committed-source reconciliation covers [authentication boundaries](content/guides/authentication-boundaries.md) (OIDC role normalization, target-bound password/OIDC redirects, serialized device-code approval and transactional pending-registration approval) and [machine ownership](content/api/machine-ownership.md) (user-session delete ownership conflicts return `409`). Report-run lists omit `result_data`; authorized detail/download preserves the body. Delete/report-run/auth additions remain outside the reviewed read-only OpenAPI subsets. The containing source SHA is recorded above; no released build or runtime-security certification is claimed. Docs tests and Docker smoke validate the documentation only.

## Migration record

The initial import includes **47 authored Markdown documents**, screenshots, banner source/image, Printer-MIB, application icons, and the original MIT license. See [MIGRATION.md](MIGRATION.md) and [migration-manifest.json](migration-manifest.json) for scope, repaired links, source hashes, and cutover steps.

Original documentation remains in the program repository during staged cutover. Do not run the importer again over edited content: it deliberately refuses overwrites. Repository automation instructions, third-party license files, and test-fixture documentation are not public-site content.
