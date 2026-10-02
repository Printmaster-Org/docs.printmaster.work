# PrintMaster documentation

Self-hosted Hugo documentation for [PrintMaster](https://github.com/Printmaster-Org/printmaster), published at **[docs.printmaster.work](https://docs.printmaster.work/)**.

The local theme uses PrintMaster's Solarized dark/light palette, icon, panels, and borders. It includes responsive navigation, a table of contents, keyboard-accessible controls, and client-side full-text search. No external theme, fonts, CDN, or JavaScript framework is required.

## Run locally

With the Hugo version in `.hugo-version` installed:

```bash
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
npm test
hugo --gc --minify --panicOnWarning
npm run check
docker build -t printmaster-docs:local .
bash scripts/smoke.sh printmaster-docs:local
```

Node.js 22+ is used only for development/CI checks; no npm dependencies or Node runtime are shipped. Docker installs the pinned Hugo release and verifies its archive checksum before building. Update `.hugo-version` and the Dockerfile default together when upgrading Hugo.

## Migration

The initial import includes **47 authored Markdown documents**, screenshots, banner source/image, Printer-MIB, application icons, and the original MIT license. See [MIGRATION.md](MIGRATION.md) and [migration-manifest.json](migration-manifest.json) for scope, repaired links, source hashes, and cutover steps.

Original documentation remains in the program repository during staged cutover. Do not run the importer again over edited content: it deliberately refuses overwrites. Repository automation instructions, third-party license files, and test-fixture documentation are not public-site content.
