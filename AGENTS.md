# Agent Instructions

This is the canonical documentation site for PrintMaster, including the application, product website, and standalone Scans utility. Their repositories are normally checked out alongside this one at `../printmaster`, `../printmaster.work`, and `../scans`. The main application's [AGENTS.md](../printmaster/AGENTS.md) describes how program and docs changes are paired.

## Documentation impact (required check)

This repository publishes user/operator documentation and selected technical references. Assess documentation impact for every implementation change across the sibling repositories; **the assessment is required, but a documentation edit is conditional**.

- Update public pages when an implementation change alters user/operator-visible behavior, task steps or outcomes, supported platforms, configuration/defaults, permissions/security expectations, API/protocol contracts, compatibility, releases, deployment, upgrades, or recovery guidance. Keep the page focused on what its reader needs to know or do. Source-local READMEs/examples also need changes when their own instructions become inaccurate.
- Internal refactors, test-only changes, and build/CI maintenance normally require no site edit when public behavior and reader instructions are unchanged. In the completion summary, state pages/contracts updated or give a concise reason no public-doc change was needed.
- Organize public content around reader tasks: installation, setup, use, troubleshooting, deployment/operations, and deliberately maintained API/protocol or contributor references. Developer content is appropriate when it helps a defined developer/contributor task; it is not a general home for implementation diaries, commit-by-commit audit evidence, internal backlogs, or routine engineering progress. Keep those in source repositories, PRs, issues, or maintainer records. Do not add a public page merely to record that a code change occurred.
- Keep existing public instructions accurate as they are touched; consolidate or retire obsolete reader guidance rather than appending competing versions. Do not recreate removed legacy documentation trees or duplicate canonical guides in source repositories.
- Verify published behavior against implementation and distinguish unreleased changes from behavior available in a published release. Preserve imported `source`/`sourceCommit` provenance. For API contracts, follow [API_MAINTENANCE.md](API_MAINTENANCE.md); do not imply that a reviewed subset covers the entire API.
- Follow the [README](README.md) for editing and validation. When a docs change is paired with an implementation change, link them one-way: the docs commit may reference the implementation commit; do not require a docs SHA in the program commit. Report pages changed and validation run.
- If a required source checkout is unavailable, report the blocker and exact pages that need verification or updating; do not silently claim affected documentation is current.

## Commit messages (required)

Use [Conventional Commits](https://www.conventionalcommits.org/). The `.githooks/commit-msg` hook rejects other subjects. Enable it once per clone with `git config core.hooksPath .githooks`, and never bypass it with `--no-verify`.

```
type(scope): imperative summary, lowercase, no trailing period

What the documentation now covers and why.

Implementation: Printmaster-Org/<repo>@<full sha>        (when paired with an implementation change)
Co-authored-by: ...                                     (trailers last)
```

- Docs changes normally use `docs(scope): …`, where the scope is the area touched, such as `devices`, `api`, `protocol`, `epson`, or `vendor`. Use `fix`, `ci`, `build`, `test`, or `chore` for site tooling, workflow, and script changes.
- Allowed types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`, `style`, `revert`, `ux`. Add `!` after the type or scope for breaking changes.
- Keep the subject at 100 characters or fewer, with a blank line before the body.
- Use a one-way commit link: the docs commit references the implementation commit below. Do not require a docs SHA in the program commit; this avoids circular references.
