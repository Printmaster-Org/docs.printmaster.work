# Documentation migration

## Phase 1: completed

Imported from `Printmaster-Org/printmaster` commit `565f4c0762e467f083f54a9e0e7f6bc23ada56c3`.

| Original location | Site section |
| --- | --- |
| `docs/*.md` | `/guides/` |
| `docs/deployment/` | `/deployment/` |
| `docs/api/` | `/api/` |
| `docs/dev/` | `/development/` |
| `agent/`, `server/`, `common/logger/` docs | `/components/` |
| `tests/README.md`, `tests/E2E_TESTING.md` | `/development/testing/` |
| Root README, CONTRIBUTING, SECURITY | `/project/` |
| Root Git integration notes | `/development/git-integration-summary/` |

All **47** authored docs are represented. Additional section index pages organize the Hugo site. The testing guidelines use `/development/testing-ci/` to avoid colliding with the E2E testing section.

- Original prose and fenced examples retained; links rewritten for the site.
- 28 stale references redirected to their existing replacement documents. Additional stale anchors repaired after rendered-site validation.
- Images, screenshot filenames, banner source, Printer-MIB, and icons copied locally.
- Code-file links point at the immutable source commit on GitHub.
- `source` / `sourceCommit` front matter and a manifest retain provenance and original SHA-256 hashes.
- Planning/TODO documents and the duplicate historical agent overview are labeled as historical notes.
- No original files deleted or changed; no existing working-tree edits touched.

### Unavailable historical references

The old repo already referenced files that do not exist. These references are now visible text marked **legacy document unavailable**, rather than broken hyperlinks. Exact source occurrences are recorded in the manifest:

- `ROADMAP.md`
- `SETTINGS_TODO.md`
- `LIVE_DISCOVERY_TODO.md`
- `CAPABILITY_INTEGRATION.md`
- `DATABASE_ROTATION.md`

Do not invent missing content. Restore these only if authoritative historical sources are located.

### Intentional exclusions

- `.github/` repository instructions and pull-request templates stay with the program.
- Vendored Flatpickr licenses remain beside their distributed library; the docs site does not use it.
- `tests/testdata/README.md` describes test fixtures and remains source-local.
- Program root/component READMEs, contributing instructions, and security policy remain in place until cutover; some must always retain useful repository-local entry points.

## Phase 2: publish and cut over

1. Push this repository; confirm GitHub CI passes and the multiarchitecture GHCR image is published.
2. Configure package visibility, deploy the image, set DNS and TLS for `docs.printmaster.work`.
3. Verify public navigation/search, screenshots, source links, and operator instructions.
4. Switch the program README documentation table and contributor pointers to the live site.
5. Replace old guides with concise canonical-site pointers in a separate program-repo commit. Keep GitHub-recognized security/contribution files and component entry-point READMEs.
6. Retain assets still used by the program README; do not delete the banner/screenshots until those references are changed.

Phase 1 establishes the docs repo as the editing destination without breaking current repository links or assuming the domain is already deployed. Historical documents were migrated, not audited for product-version accuracy.
