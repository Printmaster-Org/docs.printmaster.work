# PrintMaster documentation

Hugo documentation for [PrintMaster](https://github.com/Printmaster-Org/printmaster). Target domain: **[docs.printmaster.work](https://docs.printmaster.work/)**.

The local theme uses PrintMaster's Solarized dark/light palette, icon, panels, and borders. It includes responsive navigation, a table of contents, keyboard-accessible controls, and client-side full-text search. No external theme, fonts, CDN, or JavaScript framework is required.

## Hosting

The public site is served at **[docs.printmaster.work](https://docs.printmaster.work/)** by GitHub Pages. The repository is public, the custom-domain certificate is approved, and HTTPS is enforced. The `Documentation CI and container` workflow validates changes before deploying `main`; pull requests are not deployed.

Hugo produces static HTML/CSS/JS. Docker is an optional self-hosting alternative; Cloudflare Pages is another static-host option. See [DEPLOYMENT.md](DEPLOYMENT.md) for the live Pages setup and alternatives.

| Option | Current use | Server required |
| --- | --- | --- |
| GitHub Pages | Production site at `docs.printmaster.work` | No |
| Docker | Optional self-hosting fallback | Yes |
| Cloudflare Pages | Optional alternative host | No |

The published site is public. Review documentation for confidential or customer-specific material before merging; source and site visibility are separate concerns.

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

### Optional self-hosting setup

- The GHCR package is public for anonymous pulls. CI publishes the image after successful validation; it does not update a self-hosted server.
- Configure DNS, TLS, and the deployment host separately. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Edit documentation

Edit Markdown under `content/`; this repository is the canonical editorial home. The application repository no longer carries the legacy documentation trees or standalone guides; its retained READMEs link here. Keep runtime resources, examples, test fixtures, licenses, and contributor/security/agent entry points with the code that uses them. Use Hugo front matter with a title and root-relative links to the published page URLs. Update navigation weights in section front matter. Keep documentation assets and downloads under `static/` and theme code under `assets/` / `layouts/`; link downloads from their relevant guide (for example, the Printer-MIB resources in the SNMP reference).

### Content structure

The primary entry points follow reader tasks:

- `content/start-here/`: installation and first setup.
- `content/guides/`: day-to-day PrintMaster use, settings, access, and help.
- `content/scanning/`: receiving destinations, copier-side SMB setup, and document-delivery troubleshooting. Independent of PrintMaster.
- `content/printers/<brand>/`: each brand's scanning, networking, email, printing, security, and maintenance knowledge base. Independent of PrintMaster.
- `content/deployment/`: hosting, services, upgrades, backups, and recovery.
- `content/api/`: API, machine-protocol, and SNMP references for integrators and administrators.
- `content/guides/security.md`: deployment security and private vulnerability reporting.

Use section front-matter `groups` (`title` plus `pages` content references) to curate task groups shared by landing cards and sidebar navigation. Unlisted children remain visible automatically; invalid references fail the build. The moved installation, first-setup, Scans, and manual Windows guides retain their published routes through explicit `url` values, so existing bookmarks and fragment links still work. Migration manifest destinations track the relocated imported source files; the one-time migration tool still records the original import layout and must not be rerun over editorial content.

`npm run check` validates generated local links/assets/anchors and also requires every searchable page to appear in the documentation navigation, preventing orphaned guides.

Use `status: planned` for a reader-visible placeholder when a useful procedure is not yet verified. Planned status appears on the page, in navigation, and search. Use `status: needs-validation` when some model-specific steps have been inspected but the end-to-end result is not yet verified. The `image-placeholder` shortcode renders a visible capture brief without a broken image request.

Scanning walkthroughs with an inspected device interface but no verified save-and-delivery run use `status: needs-validation` (**Delivery test pending**) across the same surfaces. They must distinguish observed UI, manual-sourced instructions, and untested actions, and identify whether screenshot values are synthetic/unsaved.

Imported pages retain `source` and `sourceCommit` as import provenance. Verify current product behavior against the supported release before changing user instructions; do not treat historical source revisions as release claims.

All HTML layouts inherit `layouts/_default/baseof.html`, which includes `layouts/partials/footer.html`. The shared footer adds the **Site stats** link to <https://stats.docs.printmaster.work/> and loads the async GoatCounter script from `//gc.zgo.at/count.js`, reporting page views to `https://stats.docs.printmaster.work/count`. This includes the homepage, guides, API references, and 404 page, but not search JSON, feeds, downloadable files, or `/healthz`. Analytics requires JavaScript and may be blocked by browser privacy settings; documentation remains usable without it. The custom stats hostname needs its GoatCounter CNAME and HTTPS configuration; dashboard visibility is controlled in GoatCounter. This analytics integration applies to the hosted docs, not self-hosted Agent/Server UIs.

```bash
npm ci --ignore-scripts
npm run vendor:api
npm test
hugo --gc --minify --panicOnWarning
npm run check
docker build -t printmaster-docs:local .
bash scripts/smoke.sh printmaster-docs:local
```

Node.js 24 is build/test tooling only, not a runtime dependency. Development dependencies validate OpenAPI and provide Swagger UI assets. `npm run vendor:api` copies the viewer and its licensing locally; the API viewer uses no CDN or external validator, and request execution is disabled. GoatCounter is the separate external analytics script described above. No Node runtime or `node_modules` is shipped, only static assets. Repeat vendoring after dependency updates and before each Hugo server/build invocation. Docker performs dependency installation and vendoring in its build stage, installs the pinned Hugo release, and verifies its archive checksum. Update `.hugo-version` and the Dockerfile default together when upgrading Hugo.

The [server API overview](https://docs.printmaster.work/api/) links to the 17-operation [OpenAPI reference](https://docs.printmaster.work/api/openapi/) and [downloadable YAML](https://docs.printmaster.work/openapi/server.yaml).

## API References

The public [API section](https://docs.printmaster.work/api/) includes separate Server, Agent, and machine-protocol references, plus the [Printer SNMP reference](https://docs.printmaster.work/api/snmp-reference/). These are scoped technical references, not a guarantee that every endpoint is covered or that all existing UI routes are stable public APIs. Request execution is disabled in the hosted viewer; keep fleet credentials private.

Server OpenAPI covers 17 operations; Agent OpenAPI covers seven local reads. For contract changes, follow [API_MAINTENANCE.md](API_MAINTENANCE.md) and verify affected handlers and authorization in the program repository. Record implementation and validation details in the associated PR, not in a public audit log.
