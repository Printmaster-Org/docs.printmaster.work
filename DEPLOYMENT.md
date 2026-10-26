# Put the documentation online

Hugo builds a static site. Docker is one hosting option, not a requirement. The site includes no backend, database, or runtime secrets.

## Build prerequisites

Direct Hugo builds require Node.js 24 for build/test tooling and the pinned Hugo version in `.hugo-version`. Before `hugo server` or a production build, run `npm ci --ignore-scripts`, then `npm run vendor:api`. The latter copies Swagger UI and its licensing into local static assets; no CDN, external validator, or Node runtime is needed by the deployed site. The public API viewer has request execution disabled. Docker already performs installation and vendoring in its build stage; the opt-in GitHub Pages job reuses that generated output.

## Current production: GitHub Pages

The public repository publishes the production site at **https://docs.printmaster.work/**. GitHub Pages uses the custom domain, its certificate is approved, and HTTPS enforcement is enabled. The `Documentation CI and container` workflow deploys `main` only after validation; pull requests are never deployed. `ENABLE_GITHUB_PAGES=true` is the deployment gate.

The website is public. Do not publish customer data, credentials, or maintainer-only operational records. Repository and website visibility are separate concerns; removing a page from the current site does not remove it from Git history or old caches.

References: [GitHub Pages with custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

## Alternative: Cloudflare Pages — free hosting, optional private source

Use this alternative only if you later prefer Cloudflare hosting. It also supports private source without a paid GitHub organization plan.

1. In Cloudflare, open **Workers & Pages → Create → Pages → Connect to Git**.
2. Authorize the GitHub integration for **only** this repository. Organization policy may require an owner to approve the installation.
3. Select `Printmaster-Org/docs.printmaster.work`, production branch **main**.
4. Configure the build:

   | Setting | Value |
   | --- | --- |
   | Framework preset | Hugo |
   | Root directory | Repository root (leave blank) |
   | Build command | `npm ci --ignore-scripts && npm run vendor:api && npm test && hugo --gc --minify --panicOnWarning && npm run check` |
   | Build output directory | `public` |
   | Environment variable | `HUGO_VERSION=0.150.1` (match `.hugo-version`) |
   | Environment variable | `NODE_VERSION=24` |

5. Run the first deployment and confirm the provider URL loads. Canonical URLs still target the intended custom domain.
6. In the Pages project's **Custom domains**, add **docs.printmaster.work**. Do this through the project before creating a DNS record; a bare CNAME alone does not associate the domain with the Pages project.
7. If Cloudflare manages this zone, let the project create its DNS record. Otherwise add the CNAME instructed by Cloudflare, pointing `docs` to the assigned `<project>.pages.dev` hostname.
8. Wait for domain verification and TLS issuance, then verify the custom domain.

Subsequent pushes to `main` deploy automatically through Cloudflare. GitHub's Docker CI continues independently; it is not the Cloudflare deployment gate. The Cloudflare build explicitly installs locked dependencies without lifecycle scripts, vendors the local API viewer **before Hugo**, and runs the same unit tests and generated-link checks before publishing. Provider dependency installation alone does not replace `npm run vendor:api`. If previews should not expose unpublished changes, disable preview deployments or protect them with Access.

## Maintain GitHub Pages

The custom domain is configured in repository **Settings → Pages**; GitHub Pages DNS and the HTTPS certificate are already active. Do not change repository visibility or DNS as part of a routine content update.

After a change reaches `main`, inspect the **Documentation CI and container** workflow. It must pass **Build and validate docs** before **Deploy to GitHub Pages (opt-in)** runs. Verify the custom domain over HTTPS and check a representative page and 404 response after deployment.

To stop future deployments, set `ENABLE_GITHUB_PAGES=false`. This does not remove an already-published site; disable Pages separately if the site must be taken offline.

## Alternative: keep the existing Docker deployment

Use the [Docker instructions](README.md#deploy-the-ci-image). The GHCR image is public, so anonymous pulls work. Deploy it on your host, point DNS there, and terminate HTTPS at your reverse proxy.

The CI image publication job still builds amd64/arm64 images. Enabling GitHub Pages does not remove this self-hosting alternative.

## Before declaring the site live

- Public domain loads over HTTPS without a certificate warning.
- Installation, configuration, API, and printer-setup pages load.
- The OpenAPI viewer at `/api/openapi/`, YAML at `/openapi/server.yaml`, and local Swagger UI assets load without CDN requests.
- Search, screenshots, theme toggle, and mobile navigation work.
- Unknown routes return a real 404.
- Source links point at the expected code repository; private-source edit links require GitHub authorization.
- The site links to the current application and Scans repositories; retired developer records are not published.
