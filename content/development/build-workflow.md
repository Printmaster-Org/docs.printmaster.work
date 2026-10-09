---
title: "Build & Release Workflow"
source: "docs/dev/BUILD_WORKFLOW.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

## Quick Start (Development)

### Windows PowerShell Quick Launch

Use the helper script to test, build, and launch the agent:

```powershell
# From project root (where dev/ exists)
pwsh -NoProfile -ExecutionPolicy Bypass .\dev\launch.ps1
```

This script will:
- Run `go test ./...` (exits if tests fail)
- Build agent into `./bin/printmaster-agent.exe`
- Start the built binary
- Open browser to `http://localhost:8080`

### Manual Development Workflow

If you prefer manual control:

```powershell
# Run tests
go test ./...

# Build (from project root)
go build -o ./bin/printmaster-agent.exe ./agent

# Run the agent
./bin/printmaster-agent.exe

# Open UI
Start-Process 'http://localhost:8080'
```

**Note**: The launch script is intentionally conservative - tests must pass before build and server start.

---

## Quick Reference

### Daily Development

```powershell
# Build agent for development (with debug info)
.\build.ps1 agent

# Build server
.\build.ps1 server

# Build both
.\build.ps1 both

# Run tests
.\build.ps1 test-all

# Clean artifacts
.\build.ps1 clean
```

### VS Code Tasks (Ctrl+Shift+B)

JavaScript validation uses separate runners: `npm run test:js` runs Jest unit
tests, and `npm run test:playwright` runs browser tests under
`common/web/__tests__/playwright`. CI runs the cross-browser variant,
`npm run test:playwright:all`. Device selection/details controls are checked by
Playwright with column pinning and horizontal scrolling; browser checks must
not be placed under Jest's unit-test directories as standalone scripts.
This runner separation and device-control regression were verified against
[source commit cb88bee](https://github.com/Printmaster-Org/printmaster/commit/cb88bee07d0393563b250a2b9d00263363d3ff54).

- **Build: Agent (Dev)** - Default build task
- **Build: Server (Dev)** - Build server
- **Build: Both (Dev)** - Build both components
- **Test: Agent (all)** - Run all agent tests
- **Test: Server (all)** - Run all server tests
- **Show Version** - Display current versions
- **Show Build Log** - View recent build output

### VS Code Debug (F5)

- **Debug: Agent (Default Port)** - Launch agent on port 8080
- **Debug: Agent (Port 9090)** - Launch agent on port 9090
- **Debug: Server (Default Port)** - Launch server on port 3000
- **Debug: Agent + Server Together** - Launch both simultaneously

### Making Releases

The release scripts, Beta lifecycle, CI/CD publishing, and build-channel behavior
in this section were reviewed against [source commit 869a0c1](https://github.com/Printmaster-Org/printmaster/commit/869a0c1174257409f8eb18fbe61612f34998b471).
Other sections retain their earlier source review. Validation covers local
scripts and fixtures; it is not a claim that a Beta has been published.

Both `release.ps1` (Windows) and `release.sh` (Linux/macOS with Bash 4+) support
**Stable**, **Beta**, and the existing separate **Dev** workflow. Release scripts
require a clean worktree and manage the component VERSION files for you; do not
edit those files manually. Commit and push the release tooling before using it,
so GitHub runs the matching CI/CD workflows.

```powershell
# Patch release (0.1.0 → 0.1.1) - Bug fixes
.\release.ps1 agent patch

# Minor release (0.1.0 → 0.2.0) - New features, backward compatible
.\release.ps1 agent minor

# Major release (0.1.0 → 1.0.0) - Breaking changes
.\release.ps1 agent major

# Release server
.\release.ps1 server patch

# Release both components together
.\release.ps1 both patch
```

**What both release scripts do:**
1. ✅ Check git status (stop if uncommitted changes exist)
2. ✅ Bumps version in VERSION file
3. ✅ Runs all tests
4. ✅ Builds release binary (optimized, stripped)
5. ✅ Commits VERSION change
6. ✅ Tag each component (e.g., `agent-v0.2.0`, `server-v0.2.0`)
7. ✅ Pushes to GitHub

### Beta cycle and Stable promotion

From `0.31.1`, start the next minor version as `0.32.0-beta.1`, advance to
`0.32.0-beta.2`, then promote exactly `0.32.0` to Stable:

```powershell
# Preview only: no tests, builds, VERSION writes, commits, tags, or pushes
.\release.ps1 both minor -Beta -DryRun

# First Beta: bump the target base version and append -beta.1
.\release.ps1 both minor -Beta

# Next Beta: increment only the beta sequence
.\release.ps1 both beta

# Stable: remove the beta suffix, without another patch/minor/major bump
.\release.ps1 both stable
```

Equivalent Bash commands:

```bash
./release.sh both minor --beta --dry-run
./release.sh both minor --beta
./release.sh both beta
./release.sh both stable
```

Use `agent` or `server` instead of `both` for independent cycles. The initial
target can use `patch`, `minor`, or `major`. While a component is in a Beta cycle,
only `beta` (advance) or `stable` (promote) is accepted; `beta` and `stable` require
an existing `x.y.z-beta.N` version. Existing release tags are never overwritten.
With `both`, each component retains its own base version and beta sequence.

The scripts create annotated tags such as `agent-v0.32.0-beta.1` and
`server-v0.32.0-beta.1`. GitHub CI and CD accept these tags, verify that the tag
matches the committed VERSION, embed the full version with build type `beta`,
and create a GitHub **prerelease**, not the latest Stable release.

Beta releases publish versioned binaries and Docker images plus the moving
Docker `beta` alias. Agent Beta releases also attach DEB and RPM packages;
package metadata uses `0.32.0~beta.1` so Stable `0.32.0` sorts newer, while asset
filenames retain `0.32.0-beta.1` for release intake. **MSI installers are
Stable-only**; use the Windows executable to test Beta. Beta releases never move
Git `latest-agent`/`latest-server`, major/minor floating tags, Docker `latest` or
minor aliases, or publish to the Stable APT/DNF repositories. Install Beta
packages directly from release assets, not the Stable repository installer.

Stable promotion follows the normal Stable publishing path, including those
Stable aliases, package repositories, and the Agent MSI. Main-branch pushes
continue producing separate `x.y.z-dev.<sha>` prereleases and Docker `main` /
`dev-<sha>` images, even while VERSION contains a Beta.

For fleet testing, enable `releases.include_prerelease = "true"` on a Stable
server so intake caches Beta artifacts, then choose **Beta** in fleet settings.
Beta and Dev servers include prereleases by default unless explicitly disabled.
Empty local update channels follow the build type; explicit local or
fleet channel selections still take precedence. Selecting Beta does not
generate a release or fall back to Stable when no Beta artifact is available.
MSI-installed and APT/DNF-managed Agents always follow Stable, because no Beta
MSI or repository package exists. Since [73197f9](https://github.com/Printmaster-Org/printmaster/commit/73197f94515e75003f8103372d3de6aa78b1bc9c),
they ignore a Fleet Beta/Dev selection and refuse explicit Beta/Dev installs (see
[install-method channel limits](/guides/configuration/#agent-update-channels)).
For fleet-managed Beta auto-updates use standalone binaries or Docker; package
installations require manual installation of the Beta release assets.

CD release bodies are generated with the release type in mind (reviewed at
[d75aa7c](https://github.com/Printmaster-Org/printmaster/commit/d75aa7c4a69ff31ee70ee5ae73c4ac000d39391a)).
Docker instructions pin the exact version and name the channel alias (`beta` or
`latest`); images are built for `linux/amd64` and `linux/arm64` only.
`scripts/release-companion.sh` resolves the companion Agent/Server section for both
workflows. A same-version companion wins, so `release both --beta` links the Beta
pair. Otherwise the newest Stable release in the same minor line is used; other
Beta and Dev tags are never a fallback. When none exists the body says so instead
of rendering empty links. Beta companion sections omit the Stable-only APT/DNF
commands and MSI. `scripts/release-companion.test.js` covers resolution and
guards both bodies against `:latest` and unbuilt architectures.

The optional `-CreateGitHubRelease` / `--create-github-release` also marks Beta
as a prerelease and not latest, but normally let CD create the release with all
assets. These options require the GitHub CLI. `-SkipPush` / `--skip-push` still
create local commits and tags; unlike dry-run, they are not read-only.

### Release Flags

```powershell
# Dry run (see what would happen without doing it)
.\release.ps1 agent patch -DryRun

# Skip tests (not recommended!)
.\release.ps1 agent patch -SkipTests

# Skip GitHub push (for local testing)
.\release.ps1 agent patch -SkipPush
```

### Git Workflow

```powershell
# Check status
git status

# Stage all changes
git add -A

# Commit
git commit -m "your message"

# Push
git push

# Or use VS Code tasks:
# - Git: Status
# - Git: Commit All
# - Git: Push
# - Git: Pull
```

## Semantic Versioning Guide

Format: `MAJOR.MINOR.PATCH`

### PATCH (0.1.0 → 0.1.1)
- Bug fixes
- Performance improvements
- Documentation updates
- No new features
- **100% backward compatible**

**Examples:**
- Fix SNMP parsing error
- Update vendor OID mapping
- Improve error messages

### MINOR (0.1.0 → 0.2.0)
- New features
- New functionality
- Deprecations (with backward compatibility)
- **Backward compatible** (existing code still works)

**Examples:**
- Add new printer vendor support
- Add metrics export endpoint
- Add configuration option

### MAJOR (0.1.0 → 1.0.0)
- Breaking changes
- Remove deprecated features
- Change API contracts
- **NOT backward compatible**

**Examples:**
- Remove old API endpoints
- Change database schema (non-compatible)
- Change configuration format

## Pre-1.0 Development

During `0.x.x` versions, breaking changes are acceptable in MINOR releases since the API is not yet stable. Once you hit `1.0.0`, you must follow strict SemVer rules.

## Version Strategy

- **Agent**: Independent versioning (VERSION file at root)
- **Server**: Independent versioning (server/VERSION file)
- **Tags**:
  - Agent releases: `v0.2.0`
  - Server releases: `server-v0.2.0`
  - Combined releases: `v0.2.0` (both bumped together)

## CI/CD Integration

This section was reviewed against PrintMaster commit
[`f556dd3`](https://github.com/Printmaster-Org/printmaster/commit/f556dd33e1e671ad49ec6c381a834d7a6942c438).
The imported sections elsewhere on this page retain their original source metadata.

The program's `ci.yml` workflow runs on pushes to `main`, component release
tags (`agent-vX.Y.Z` and `server-vX.Y.Z`), pull requests targeting `main`, and
manual dispatch. Its aggregate **CI Passed** job succeeds only when the Agent,
Server, JavaScript, mock E2E, and Docker E2E jobs succeed; Agent and Server also
depend on the Common job.

The `cd-agent.yml` and `cd-server.yml` workflows run on `main`, their respective
component release tags, or manual dispatch. Before building binaries or
publishing container images, each waits for **CI Passed** on the exact triggering
commit (`github.sha`), not a moving branch ref.

Both gates use `matiasalbarello/wait-on-check-action-ts` v1.2.0, pinned to commit
`8087812521cdb59ebc7751984b31b17209b30eeb`. This action runs natively on Node.js 24
and needs only the workflow's `GITHUB_TOKEN` with `checks: read` (the gate job also
retains `contents: read`). It polls every 15 seconds and accepts only `success`;
skipped, cancelled, or failed checks do not unblock CD. Missing checks are not
accepted: discovery can wait up to 900 seconds, with a 15-minute step timeout
capping the entire discovery-and-completion wait. The action itself fails on
disallowed conclusions or exhausted discovery; GitHub stops the step on timeout.
No separate conclusion-output guard is needed.

For manual CD runs, ensure CI has also run on the selected commit. Dispatching CD
alone does not start CI, and an absent **CI Passed** check blocks publication.

### Agent development release publication

Reviewed fix: [source commit 9e4b46c](https://github.com/Printmaster-Org/printmaster/commit/9e4b46c619a086fd62c1788b85decfaba712a7dd), separate from persistent Fleet channel/bootstrap commit `589e269fb1cd18a48383cd6e757bc32bdab4159b`. Validation: actionlint v1.7.7 passed workflow expressions/job wiring (external shellcheck/pyflakes disabled), Bash syntax passed, independent YAML parsing passed, and 52 Jest tests passed, including main/tag dependency cases, failed dependencies, full asset staging and missing/empty binary rejection. The canonical docs tests and fresh Hugo/Docker link/anchor/runtime smoke checks passed. This validates source/configuration locally; no new remote dev-release publication is claimed from this validation.

**CD Agent** builds Linux amd64/arm64, Windows amd64 and macOS amd64/arm64 binaries plus the Docker manifest after CI. A successful `main` run then creates GitHub prerelease `agent-v<base-version>-dev.<short-sha>`, explicitly targeting the built full SHA. No product VERSION bump is needed for dev publication.

**Skip root cause:** CD Agent [run 37357026728](https://github.com/Printmaster-Org/printmaster/actions/runs/37357026728) completed binaries/Docker successfully but skipped **Build RPM Packages (Fedora)** and **Create Agent Dev Release**. RPM is stable-tag-only, while dev publication incorrectly depended on RPM success. GitHub's implicit successful-dependency gate skipped dev publication on `main`. The fix removes only that tag-only dependency; binary/Docker success remains mandatory. Failed/cancelled dependencies cannot publish. Stable releases still require RPM packaging.

Dev asset staging copies every supplied `printmaster-*` distributable and requires nonempty binaries for all five matrix targets. Missing/empty binaries or unmatched uploads fail rather than publishing an empty prerelease. Debian packages are included when built; Windows MSI/RPM remain stable-tag-only. This does not add dev MSI/RPM or dev package-repository publication. Docker retains `main` and `dev-<short-sha>` tags.

Previously skipped releases are not backfilled automatically. Publish a new `main` push containing the fix, or dispatch **CD Agent** on updated `main` after its CI succeeds; verify **Create Agent Dev Release** and attached binaries. Re-running an old run uses its old workflow revision and is not reliable recovery. Local lint/tests do not prove GitHub publication.

To consume dev binaries, enable Server prerelease intake, restart when required, sync cache and select the Agent channel. See [persistent Fleet channels and old-Agent bootstrap](/guides/configuration/#agent-update-channels). Product, Docker and HTTP/machine protocol versions remain independent; no protocol/contract version changes are introduced here.

## Troubleshooting

### "Uncommitted changes detected"
```powershell
# Commit or stash changes first
git add -A
git commit -m "description"

# Or stash temporarily
git stash
.\release.ps1 agent patch
git stash pop
```

### "Tests failed"
```powershell
# Run tests manually to see details
cd agent
go test ./... -v

# Fix tests, then retry release
```

### "Build failed"
```powershell
# Check build log
Get-Content logs\build.log -Tail 50

# Or use VS Code task: "Show Build Log"
```

### Release went wrong
```powershell
# Undo last commit (keep changes)
git reset HEAD~1

# Restore VERSION file
git restore VERSION

# Delete tag
git tag -d v0.2.0

# Start over
```

## Best Practices

1. **Always commit working code before releasing**
2. **Write meaningful commit messages**
3. **Test locally before pushing**
4. **Use patch for bug fixes, minor for features**
5. **Document breaking changes in CHANGELOG.md**
6. **Tag releases immediately after merge to main**

## Example Workflow

```powershell
# 1. Start feature work
git checkout -b feature/new-scanner

# 2. Make changes, test locally
.\build.ps1 agent
.\build.ps1 test-all

# 3. Commit work
git add -A
git commit -m "feat: Add Ricoh network scanner support"

# 4. Merge to main
git checkout main
git merge feature/new-scanner

# 5. Release (minor version - new feature)
.\release.ps1 agent minor

# Done! Version bumped, tagged, and pushed to GitHub
```

## VS Code Integration

All build, test, and release commands are available via:
- **Command Palette** (Ctrl+Shift+P): "Tasks: Run Task"
- **Keyboard Shortcuts**:
  - `Ctrl+Shift+B` - Build menu
  - `F5` - Start debugging
  - `Shift+F5` - Stop debugging
- **Tasks Explorer** (Terminal → Run Task)

---

## Cross-Platform Testing

### Testing on Linux (WSL)

For cross-platform validation, test on Linux using WSL (Windows Subsystem for Linux):

#### Install Go in WSL (one-time setup)

```bash
# Download and install Go 1.27.0
wget https://go.dev/dl/go1.27.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.27.0.linux-amd64.tar.gz
rm go1.27.0.linux-amd64.tar.gz

# Add to PATH (append to ~/.bashrc)
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Verify installation
go version
```

#### Run tests on Linux

```bash
# Navigate to agent directory (WSL can access Windows drives at /mnt/c/)
cd /mnt/c/temp/printmaster/agent

# Run all tests
go test -v ./...

# Run specific package tests
go test -v ./storage/...
```

#### Cross-Platform Storage Paths

The storage package uses platform-specific paths:
- **Windows**: `%LOCALAPPDATA%\PrintMaster\devices.db`  
  (e.g., `C:\Users\username\AppData\Local\PrintMaster\devices.db`)
- **Linux**: `~/.local/share/PrintMaster/devices.db`  
  (e.g., `/home/username/.local/share/PrintMaster/devices.db`)
- **macOS**: `~/Library/Application Support/PrintMaster/devices.db`

**All tests pass on Windows, Linux, and macOS**, confirming full cross-platform compatibility.

---

*Last Updated: November 6, 2025*
