# Put the documentation online

Hugo builds a static site. Docker is one hosting option, not a requirement. The site includes no backend, database, or runtime secrets.

## Build prerequisites

Direct Hugo builds require Node.js 24 for build/test tooling and the pinned Hugo version in `.hugo-version`. Before `hugo server` or a production build, run `npm ci --ignore-scripts`, then `npm run vendor:api`. The latter copies Swagger UI and its licensing into local static assets; no CDN, external validator, or Node runtime is needed by the deployed site. The public API viewer has request execution disabled. Docker already performs installation and vendoring in its build stage; the opt-in GitHub Pages job reuses that generated output.

## Planned launch: public repository + GitHub Pages

The repository is temporarily private during preparation and will become public at launch. **GitHub Pages is the preferred production host:** free for the public repository, with no Docker server or paid organization plan required. Docker remains a fallback; Cloudflare is an optional alternative, not a requirement.

Follow **Option A** when ready to change visibility. The workflow is prepared now but gated off until explicitly enabled.

### Current preparation state

Checked on **2026-10-02**:

- Repository: `Printmaster-Org/docs.printmaster.work`, **private**.
- Organization plan: **Free**.
- GitHub Pages: **not enabled**.

GitHub Pages works with public repositories on GitHub Free. A private organization repository requires **GitHub Team or Enterprise**. GitHub Pro applies to personally owned repositories, not this organization-owned repository.

References: [GitHub Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages) and [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/).

**Privacy warning:** Private GitHub source does not mean a private website. Standard Pages sites are publicly accessible, including sites built from private repositories. Do not publish confidential material. Restricting a Pages site to an organization is a separate Enterprise Cloud capability. Cloudflare Pages is also public by default; use Cloudflare Access when authentication is needed.

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

## Option A: GitHub Pages — preferred public launch

Make the repository public when ready, as planned. Review files and Git history before the visibility change; public source exposes both. No automation in this repository changes visibility.

The optional `deploy-pages` job reuses the static output from the validated Docker build. Docker runs only in CI; GitHub serves the generated files. There is no GHCR dependency for hosting and no custom deployment token to store.

1. In repository **Settings → Pages**, choose **Build and deployment → Source → GitHub Actions**.
2. Verify the custom domain belongs to you using GitHub's organization Pages domain verification flow. This protects against domain takeover.
3. Add **docs.printmaster.work** under the repository's Pages **Custom domain** setting.
4. At your DNS provider, point the **docs** CNAME to **printmaster-org.github.io** — not the repository name and not a URL/path. Remove conflicting A/AAAA records on that same subdomain only after checking existing use.
5. In **Settings → Secrets and variables → Actions → Variables**, add:

   | Variable | Value |
   | --- | --- |
   | `ENABLE_GITHUB_PAGES` | `true` |

6. Push `main`, or run **Documentation CI and container** from the Actions tab against `main`.
7. Confirm **Build and validate docs** passes, followed by **Deploy to GitHub Pages (opt-in)**. The deployed environment exposes the site URL.
8. After GitHub provisions the certificate, enable **Enforce HTTPS** and verify the custom domain.

The current site intentionally uses **[docs.printmaster.work](https://docs.printmaster.work/)** at the domain root. The default project URL (`https://printmaster-org.github.io/docs.printmaster.work/`) is not a supported fallback: imported content has root-relative links. Configure the custom domain before enabling deployment. This also avoids serving incorrect asset/search paths at the project subpath.

For Actions deployments, set the custom domain in Pages settings; GitHub does not use an artifact's CNAME file to configure it. The workflow is gated to `main`, never deploys pull requests, uses short-lived OIDC permissions, and serializes Pages deployments. Set `ENABLE_GITHUB_PAGES=false` to stop future deployments; that does not remove an already-published site. Disable Pages in repository settings to unpublish it.

References: [Publishing with Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [custom subdomains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-a-subdomain), and [domain verification](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages).

## Alternative: keep the existing Docker deployment

Use the [Docker instructions](README.md#deploy-the-ci-image). Deploy the image on your host, point DNS there, and terminate HTTPS at your reverse proxy. A private GHCR package requires Docker authentication on the deployment host; never commit registry credentials.

The CI image publication job still builds amd64/arm64 images. Enabling GitHub Pages does not remove this self-hosting alternative.

## Before declaring the site live

- Public domain loads over HTTPS without a certificate warning.
- Installation, configuration, API, and developer pages load.
- The OpenAPI viewer at `/api/openapi/`, YAML at `/openapi/server.yaml`, and local Swagger UI assets load without CDN requests.
- Search, screenshots, theme toggle, and mobile navigation work.
- Unknown routes return a real 404.
- Source links point at the expected code repository; private-source edit links require GitHub authorization.
- Only after public verification, change program-repository documentation pointers and retire old guides as described in [MIGRATION.md](MIGRATION.md).
