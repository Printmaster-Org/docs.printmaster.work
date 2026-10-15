# Agent Instructions

This is the canonical documentation site for PrintMaster. Program changes live in **Printmaster-Org/printmaster**, normally checked out next to this repo at `../printmaster`. Its [AGENTS.md](../printmaster/AGENTS.md) describes how program and docs changes are paired.

## Commit messages (required)

Use [Conventional Commits](https://www.conventionalcommits.org/). The `.githooks/commit-msg` hook rejects other subjects. Enable it once per clone with `git config core.hooksPath .githooks`, and never bypass it with `--no-verify`.

```
type(scope): imperative summary, lowercase, no trailing period

What the documentation now covers and why.

Implementation: Printmaster-Org/printmaster@<full sha>   (when paired with a program change)
Co-authored-by: ...                                     (trailers last)
```

- Docs changes normally use `docs(scope): …`, where the scope is the area touched, such as `devices`, `api`, `protocol`, `epson`, or `vendor`. Use `fix`, `ci`, `build`, `test`, or `chore` for site tooling, workflow, and script changes.
- Allowed types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`, `style`, `revert`, `ux`. Add `!` after the type or scope for breaking changes.
- Keep the subject at 100 characters or fewer, with a blank line before the body.
