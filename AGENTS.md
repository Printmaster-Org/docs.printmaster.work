# Agent Instructions

This is the canonical documentation site for PrintMaster, including the application, product website, and standalone Scans utility. Their repositories are normally checked out alongside this one at `../printmaster`, `../printmaster.work`, and `../scans`. The main application's [AGENTS.md](../printmaster/AGENTS.md) describes how program and docs changes are paired.

## Keep documentation current (required)

- Review documentation impact for every feature, fix, removal, and deprecation across these repositories. Update affected guides under `content/`, API contracts under `static/openapi/` when applicable, and source-local READMEs/examples in the same task as implementation changes.
- Maintain documentation structure as work progresses: add new canonical pages where useful, reorganize or consolidate existing material, and remove obsolete legacy plans/docs when appropriate rather than only appending to them. Keep current plans aligned with agreed scope and implemented reality; clearly distinguish pending, completed, deferred, and historical work. Preserve still-relevant decisions and recovery guidance, and update affected links, navigation, redirects and documentation tests when moving or removing pages.
- Verify documented behavior against the implementation, preserve imported `source`/`sourceCommit` provenance, and distinguish unreleased changes from published behavior. Do not recreate removed legacy documentation trees or duplicate canonical guides in source repositories.
- Follow the [README](README.md) for editing and validation and [API_MAINTENANCE.md](API_MAINTENANCE.md) for contract changes. Link implementation and documentation commits or PRs, and report the pages changed and validation run.
- If no documentation change is needed, explicitly explain why. If a required checkout is unavailable, report the blocker and exact pages needing updates rather than silently leaving docs stale or reporting completion.

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
