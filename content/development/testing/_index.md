---
title: "End-to-End Tests"
source: "tests/README.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

This directory contains integration/E2E tests that test agent and server components together.

## Full repository baseline

A green mock E2E run alone is not a full release baseline. Run the uncached Go
suites in **each** module (`common`, `agent`, `server`, `tests`):

```sh
go test -count=1 -timeout=10m ./...
```

Run `go vet ./...` and the repository-compatible `staticcheck ./...` in the
Common, Agent and Server modules for the relevant platform targets. Also run
the Linux root/native-package qualification described in the
[auto-update plan](/development/auto-update-plan/).

At the repository root, run `npm run test:js`, then the complete browser matrix.
For a constrained Windows host, use PowerShell environment assignment rather
than the POSIX assignment in `test:playwright:all`:

```powershell
$env:PW_ALL_BROWSERS = '1'
$env:PW_WORKERS = '1'
npm run test:playwright
```

One worker is a local diagnostic option, not a change to CI's two-worker
configuration. Copy-control tests retain all font/width, truncation, control
geometry and clipboard assertions, but give each font/width case its own
test budget rather than combining thirty value interactions into one timeout.
Do not use retries, forced clicks, removed assertions or global timeout
increases as evidence that an unexplained browser failure is fixed.

With Docker responsive, run `go test -count=1 -tags=integration ./storage/...`
from `server`, and the separately tagged
[real Docker E2E workflow](/development/testing/e2e-testing/).
On Windows, if testcontainers cannot discover Docker Desktop, set `DOCKER_HOST`
to the endpoint reported by the active Docker context for that process.
Check verbose output: an integration suite that skips for missing Docker is
**not** qualified. Do not start a shared Docker daemon without owner approval.

Finish with the canonical docs site's tests, fresh Hugo build and generated-site
link checks. Report failures and environmental skips separately from passing
tests; local success is not proof that the unpushed remote CI workflow ran.

## Running Tests

```bash
# Run all E2E tests
cd tests
go test -v ./...

# Run with no cache
go test -v -count=1 ./...

# Skip E2E tests (in other directories)
cd ../agent
go test -short ./...
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
