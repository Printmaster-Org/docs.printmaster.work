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

**What `release.ps1` does:**
1. ✅ Checks git status (warns if uncommitted changes)
2. ✅ Bumps version in VERSION file
3. ✅ Runs all tests
4. ✅ Builds release binary (optimized, stripped)
5. ✅ Commits VERSION change
6. ✅ Tags release (e.g., v0.2.0)
7. ✅ Pushes to GitHub

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

