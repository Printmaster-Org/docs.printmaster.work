---
title: "End-to-End Tests"
source: "tests/README.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

This directory contains integration/E2E tests that test agent and server components together.

## Shared repository test entrypoints

From the application checkout use `.\tests.ps1` on Windows or `./tests.sh`
on Unix/macOS. Both thin wrappers and CI execute the same
`scripts/run-tests.js`; test commands, selection rules and module discovery
are not copied between shells. Direct Go/npm commands remain useful for
targeted diagnostics, not as competing definitions of the full baseline.

The shared entrypoints and CI wiring were introduced in
[source commit 6af4bf4](https://github.com/Printmaster-Org/printmaster/commit/6af4bf408806d6c995cdcb95fb4339d36f3d1b96).
The unused root `commit`, `update`, `version` and `status` script pairs were
removed after checking callers; build/release and their used internal helpers
remain supported.

```powershell
.\tests.ps1                         # Core: lint, Go, Jest and all six browser projects
.\tests.ps1 --skip-playwright       # Explicit partial run
.\tests.ps1 --suite go --module agent --package ./storage
.\tests.ps1 --with-docker           # Core plus PostgreSQL and isolated Docker E2E
.\tests.ps1 --with-docs             # Core plus sibling docs validation
.\tests.ps1 --all                   # Every nonprivileged suite
.\tests.ps1 --all --skip-docker     # Also omits PostgreSQL (it requires Docker)
.\tests.ps1 --suite playwright --workers 1
.\tests.ps1 --dry-run
.\tests.ps1 --help
```

| Suite | Coverage / prerequisites |
| --- | --- |
| `lint` | `go vet` and existing compatible `staticcheck` for every discovered module, including the mock E2E module. |
| `go` | Uncached verbose `go test` with a ten-minute per-package timeout in each top-level directory containing `go.mod`. New/removed modules are picked up automatically in local runs and CI. Mock E2E is included through the `tests` module. |
| `js` | Syntax-checks Agent/Server/common web JavaScript, then all Jest suites through the existing locked dependency. |
| `playwright` | Builds Agent/Server binaries, then all six configured projects with two workers by default and no retries. |
| `integration` | Docker preflight, then actual tagged PostgreSQL storage tests. Windows passes the active context's endpoint only to the testcontainers Go subprocess when not explicitly configured; later Docker CLI suites keep their original context. |
| `docker` | Builds an isolated unique Compose project with fresh temporary data, loopback-only dynamic ports, offline SQLite seeding and actual tagged host Go E2E tests. Saves container logs and removes only that project's containers/network/images and temporary data, including on test failure. |
| `native` | Bounded native permission, descriptor-substitution and recovery regression selection. |
| `docs` | Sibling `docs.printmaster.work` Node tests, fresh Hugo build and generated links/search checks. |
| `privileged` | Explicit Unix-only root permission/package fixtures via noninteractive `sudo -n`; includes isolated real Debian installation on Linux. Never modifies installed Agent services. |

The default is **core only** by owner choice: Docker, docs and privileged
fixtures are not silently included. `--all` includes native/Docker/docs but
still requires `--privileged` to add root fixtures. `--suite` selects only
named suites (comma-separated or repeatable); `--module` limits Go/lint
modules and `--package` limits only Go tests. `--skip-NAME` omits a suite;
`--skip-docker` also removes integration. A request selecting no suites,
invalid module/flag or missing prerequisite fails rather than appearing green.
`--coverage` writes each module's `coverage.out` and the separate PostgreSQL
`coverage-integration.out`. `--dry-run` only prints selection and omissions;
it is not execution evidence.

Install prerequisites separately: Go matching the module files, Node.js 26,
`npm ci`, compatible staticcheck, and
`npx playwright install --with-deps chromium firefox webkit` where appropriate.
The runner never installs missing tools or starts Docker Desktop automatically.
Docker E2E additionally needs host `sqlite3`; on Linux its fresh root-owned
database seeding/cleanup may need noninteractive sudo. Optional docs need the
sibling checkout's locked dependencies and its configured Hugo version.
Use `--staticcheck PATH`, `--hugo PATH`, or `--docs-dir PATH` for existing
non-PATH tools/checkouts. These do not change machine configuration.

Staticcheck must also be **built with a Go version at least as new as the
modules it analyzes**. Updating its release alone is insufficient. If it reports
`application built with go1.26` against Go 1.27 modules, rebuild the CI-pinned
version with the matching toolchain, for example
`GOTOOLCHAIN=go1.27.0 go install honnef.co/go/tools/cmd/staticcheck@v0.8.1`
on Unix, or set `$env:GOTOOLCHAIN = 'go1.27.0'` in a PowerShell session before
that `go install` command. `go version -m` on the installed executable shows
its build toolchain. The runner does not silently replace tools.

Execution stops at the first failed command by default, including within a
Go/lint module. Later selected suites are marked **NOT RUN**, not passed or
intentionally omitted. Use `--keep-going` to collect independent failures across
checks, modules and suites. Docker log capture and scoped cleanup still run on
failure in either mode. The runner prints PASS/FAIL and omitted-suite summaries
and returns nonzero on any selected failure. CI uses the same fail-fast default
within each job while independent jobs can still complete.
Internal platform/opt-in skips remain visible in verbose test output; they
are **not** converted into qualification evidence. Inherited
`PRINTMASTER_LIVE_*` opt-ins are stripped from subprocess environments so a
baseline cannot accidentally enable live service/installer replacement.
Do not use retries, forced clicks, removed assertions or global timeout
increases to hide unexplained failures. `--workers 1` is a local resource
option, not evidence that a two-worker failure did not happen.

CI selects these same suites, automatically discovering Go modules, while
running each Go module in its own matrix job. Jest, PostgreSQL, Docker E2E,
native platform checks and **six Playwright shards** start independently;
Playwright does not wait for Jest or Go tests. Each shard builds its own fixture
binaries and runs two workers, avoiding the documented contention from raising
workers on one small runner. `--shard INDEX/TOTAL` selects one shard without
changing projects, assertions or retries; local runs remain unsharded by default.
All shards/modules remain required by CI Passed, even if another fails.
Linux/macOS root fixtures are explicit jobs. CI owns tool/dependency
setup and caching, not a second set of test commands. The sibling docs site
retains its own CI; use `--with-docs` locally for paired changes.

Observed CI qualification on 2026-10-21:

| Layout | Run | End-to-end elapsed |
| --- | --- | --- |
| Original grouped workflow | [39481623764](https://github.com/Printmaster-Org/printmaster/actions/runs/39481623764) | 9m26s |
| Single browser job, sequential Go modules | [39489694968](https://github.com/Printmaster-Org/printmaster/actions/runs/39489694968) | 10m25s |
| Three browser shards, parallel Go modules | [39602215312](https://github.com/Printmaster-Org/printmaster/actions/runs/39602215312) | 6m01s |
| Six browser shards, parallel Go modules | [39603309582](https://github.com/Printmaster-Org/printmaster/actions/runs/39603309582) | 3m27s |

The final run qualified [source e31370d](https://github.com/Printmaster-Org/printmaster/commit/e31370ddb420e6fdbe13189dc83018ba98ba5a37):
all required jobs passed, with 327 Jest tests and six browser shards of 114
cases each (662 passed, 22 explicitly skipped overall). No browser assertions,
projects or retries were weakened. The real Windows default build also passed
lint/Go/JavaScript before compilation. Bash/PowerShell fixtures verify release
failure before version/tag mutation and one successful gate before both builds.
These timings include setup/queue time and reflect individual runs, not a
latency guarantee; extra runners trade setup/runner minutes for lower wall time.

### Build and release gates

Basic `build.ps1`/`build.sh` builds call the wrappers once with
`--skip-playwright`: lint, all discovered Go modules (including mock E2E), web
syntax and Jest. They do not start Docker or browsers by default.
`-AllTests` / `--all-tests` selects all nonprivileged suites. To replace the
selection, pass `-TestArgs @('--suite','lint,go')` in PowerShell or
`--test-arg --suite=lint,go` in Bash; repeat `--test-arg` for more arguments.
`-SkipTests` / `--skip-tests` is an explicit logged bypass.

Release calls **build validation-only -> tests --all** before version changes,
build counters, tags, commits or pushes. A failed gate cannot start the release.
After a successful gate, compilation uses an explicit skip flag to avoid
repeating tests for each component. `-TestOnly` / `--test-only` exposes the
validation-only build path without compiling. Release supports `-TestArgs` /
repeated `--test-arg` for explicit selection/prerequisite paths, or `-SkipTests` /
`--skip-tests` as a deliberate bypass. Overrides replace the default `--all`,
so include `--all` in custom arguments when only supplying `--hugo PATH`.
Dry runs preview the gate without executing it.

Missing Docker, SQLite, docs checkout/dependencies or Hugo fail the full gate;
there is no automatic installation, root elevation or silent downgrade.
Root fixtures still require explicit Unix `--privileged`. Local validation
does not replace the required cross-platform CI result or production trust
qualification. Legacy `PRINTMASTER_*_PASSED` and `PRINTMASTER_SKIP_*` environment
shortcuts no longer bypass builds; use explicit flags instead.

A green core run is not a complete release baseline. Run `--all` and the
applicable explicitly privileged/platform qualification before go/no-go.
Report omitted suites and internal skips; passing one host or configuring CI
does not prove execution on another platform.

## Installer permission qualification

From the application repository root, run the bounded native selection:

```sh
./tests.sh --suite native
```

Run the ownership/separate-identity cases as root on a disposable Unix host:

```sh
./tests.sh --suite privileged --privileged
```

On macOS the runner resolves its temporary executable directory and sets
`TMPDIR=/private/tmp` for native/root test processes rather than testing through
a `/tmp` or `/var` symbolic-link ancestor. Numeric fixture UIDs do not create
system accounts, and these tests never install or control the real Agent.
The Linux cross-filesystem case requires `/dev/shm` on a different filesystem;
report a skip explicitly if unavailable.

On Windows, the restricted-token test uses actual OS access checks and a
positive control, not an elevated account or simulated ACL evaluator. Junction
tests avoid requiring symbolic-link privilege. The separate Windows/macOS CI
job is required by CI Passed; its native Windows/macOS execution passed in
[run 39481623764](https://github.com/Printmaster-Org/printmaster/actions/runs/39481623764).
Adding or compiling a test alone is not execution evidence. Actual MSI
permissions also passed an owner-approved local installation and opted-in
SYSTEM task (`TestLiveWindowsInstallerPermissions`). That destructive test is
skipped unless `PRINTMASTER_LIVE_INSTALLER_PERMISSIONS=qualify-test-agent-msi`
is explicitly set and it runs as SYSTEM against the installed test Agent.
It must not repair ACLs before checking them, and must never run on an
unapproved installation. For observed evidence and qualification limits, see the
[permission qualification matrix](/development/auto-update-plan/#permission-qualification-matrix).

## Running Tests

```bash
# Mock E2E only (uncached by default)
./tests.sh --suite go --module tests
# Explicit component-only Go run
./tests.sh --suite go --module agent,server
```

## Test Coverage

### WebSocket Proxy Tests (`websocket_proxy_test.go`)

✅ **TestWebSocketProxy_BasicFlow** - Complete proxy request/response flow  
✅ **TestWebSocketProxy_UnreachableTarget** - Error handling for unreachable targets  
✅ **TestWebSocketProxy_MultipleRequests** - Concurrent proxy requests

### HTTP API Tests (`http_api_test.go`)

✅ **TestHTTPAPI_AgentRegistration** - Agent registration endpoint  
✅ **TestHTTPAPI_Heartbeat** - Agent heartbeat with authentication  
✅ **TestHTTPAPI_UnauthorizedAccess** - Token validation  
✅ **TestHTTPAPI_DeviceUpload** - Device batch upload endpoint

## Test Organization

- `websocket_proxy_test.go` - WebSocket proxy functionality tests
- `http_api_test.go` - HTTP API endpoint tests
- `helpers_test.go` - Shared test utilities

## Test Structure

E2E tests use:
- `httptest.NewServer()` to create mock HTTP servers
- `websocket.DefaultDialer` to test WebSocket connections
- `t.Parallel()` to run tests concurrently
- `testing.Short()` to allow skipping with `-short` flag

## Notes

- Tests use ephemeral ports to avoid conflicts
- Tests run in parallel where possible (~1.5s total execution)
- Mock servers simulate agent and server behavior
- Tests verify both success and error scenarios
