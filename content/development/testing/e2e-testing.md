---
title: "E2E Testing Strategy"
source: "tests/E2E_TESTING.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

## Overview

End-to-end tests verify that the agent and server work together correctly. These tests are more expensive than unit tests but provide confidence that the full system functions as expected.

## Quick Start

### Current qualification boundary

The CI-equivalent route builds and starts **only** the `server` and `agent`
Compose services, waits for `/health`, stops both before seeding their initialized
SQLite databases with `server_data.sql` and `agent_data.sql`, then restarts and
waits again. Do not seed a live database through a second SQLite implementation.
Current data fixtures contain eight devices per database.

The shared `docker` suite automates this route, then runs tagged Go tests on
the host with explicit `E2E_SERVER_URL`, `E2E_AGENT_URL` and
`E2E_ADMIN_PASSWORD`. It requires Docker Compose, host Go and `sqlite3`.
Each invocation uses a unique Compose project, temporary data mounts and
dynamic loopback-only ports. It captures logs in `test-results/` and attempts
project-scoped teardown on normal completion or command failure. It does not
adopt existing databases, prune Docker globally or interrupt installed services.

The optional Compose `test-runner` service now targets Server port 9090 and
preserves Go's exit status when displaying its log. It is still **not** the
shared CI qualification route, which runs Go on the host.

### Run E2E Tests Locally

```bash
# Linux/macOS
./tests.sh --suite docker

# Windows
.\tests.ps1 --suite docker
```

### Options

| Option | Description |
|--------|-------------|
| `--suite docker` | Build and qualify isolated real services, then tear down that project |
| `--suite go --module tests` | Run mock E2E without Docker (also part of the default baseline) |
| `--with-docker` | Add real Docker E2E and PostgreSQL integration to the default baseline |
| `--dry-run` | Show selection only; does not execute or qualify anything |

Run these commands from the application checkout. See [Testing](/development/testing/)
for the full suite/skip reference. Legacy `tests/run-e2e.*` helpers are not the
canonical CI baseline.

## Architecture

### Docker Compose Environment

The E2E tests use Docker Compose to create an isolated test environment:

```
┌─────────────────────────────────────────────────────────┐
│                 E2E Test Network                        │
│                                                         │
│  ┌─────────────┐         ┌─────────────┐              │
│  │   Server    │◀───────▶│    Agent    │              │
│  │  :9090      │   WS    │   :8080     │              │
│  │             │         │             │              │
│  │ SQLite DB   │         │ SQLite DB   │              │
│  └─────────────┘         └─────────────┘              │
│         ▲                       ▲                      │
│         │                       │                      │
│  ┌──────┴──────┐         ┌──────┴──────┐              │
│  │ Seed Data   │         │ Seed Data   │              │
│  │ server.db   │         │ agent.db    │              │
│  └─────────────┘         └─────────────┘              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │   Test Runner       │
               │   (go test -tags=e2e)│
               └─────────────────────┘
```

### Test Data

Pre-seeded SQLite databases provide predictable test data:

**Server Database:**
- 1 tenant: "E2E Test Tenant"
- 1 registered agent: "e2e-test-agent"
- 8 test devices in the current data-only seed
- Sample metrics for each device
- Admin user (password: `e2e-test-password`)

**Agent Database:**
- Fixed agent UUID: `e2e00000-0000-0000-0000-000000000001`
- 8 test devices (matching server)
- Scanner configuration (discovery disabled)
- Server connection settings

### Regenerating Test Data

```bash
# Linux/macOS
./seed-testdata.sh

# Windows
.\seed-testdata.ps1
```

## Test Categories

### 1. Health Checks
- Server `/health` endpoint
- Agent `/health` endpoint

### 2. Agent Registration
- Agent registers with server on startup
- Agent UUID matches pre-seeded data
- WebSocket connection establishment

### 3. Device APIs
- Server device list includes seeded devices
- Agent device list includes seeded devices
- Device metrics queries

### 4. Integration Flows
- Full agent-server communication
- Device data synchronization
- Error handling

## CI Integration

E2E Docker tests run automatically in GitHub Actions:

```yaml
# .github/workflows/ci.yml
e2e-docker:
  name: E2E (Docker)
  runs-on: ubuntu-latest
  needs: [agent, server]
  steps:
    - uses: actions/checkout@v4
    - name: Seed test databases
      run: ./tests/seed-testdata.sh
    - name: Start E2E environment
      run: docker compose -f tests/docker-compose.e2e.yml up -d --build
    - name: Run E2E tests
      run: go test -tags=e2e -v ./tests/...
```

## File Structure

```
tests/
├── docker-compose.e2e.yml    # Docker Compose for E2E environment
├── e2e_docker_test.go        # E2E tests (build tag: e2e)
├── run-e2e.sh                # Linux/macOS helper script
├── run-e2e.ps1               # Windows helper script
├── seed-testdata.sh          # Database seed script (Linux/macOS)
├── seed-testdata.ps1         # Database seed script (Windows)
└── testdata/
    ├── server/
    │   └── server.db         # Generated server database
    ├── agent/
    │   ├── agent.db          # Generated agent database
    │   └── agent_id          # Fixed agent UUID
    └── seed/
        ├── server_seed.sql   # Server seed SQL
        └── agent_seed.sql    # Agent seed SQL
```

## Troubleshooting

### Containers won't start
```bash
# Check container logs
docker compose -f tests/docker-compose.e2e.yml logs server
docker compose -f tests/docker-compose.e2e.yml logs agent

# Clean up and retry
docker compose -f tests/docker-compose.e2e.yml down -v
./run-e2e.sh --build
```

### Tests fail with connection errors
```bash
# Verify containers are healthy
docker compose -f tests/docker-compose.e2e.yml ps

# Check health endpoints manually
curl http://localhost:8443/api/health
curl http://localhost:8080/api/health
```

### Database schema mismatch
```bash
# Regenerate seed databases
./seed-testdata.sh

# Or rebuild containers to trigger migrations
./run-e2e.sh --build
```

- Error handling

### 3. WebSocket Proxy (New Feature)
- Proxy to agent UI
- Proxy to device UI
- Timeout handling
- Connection loss handling
- Multiple concurrent requests

### 4. Failure Scenarios
- Server restart while agent connected
- Agent restart
- Network interruption
- Invalid authentication
- Database errors

## Running Tests

```bash
# Mock E2E
./tests.sh --suite go --module tests

# Real Docker E2E
./tests.sh --suite docker

# Focused component Go tests only (not a complete baseline)
./tests.sh --suite go --module agent,server
```

## CI/CD Integration

```yaml
# Excerpts from .github/workflows/ci.yml; prerequisites are installed by CI.
- name: Go modules
  run: bash tests.sh --suite lint,go --coverage
- name: Real Docker E2E
  run: bash tests.sh --suite docker
```

The CI aggregate also requires JavaScript/browser, PostgreSQL and native
installer-permission jobs. Local selection flags must not weaken those required
jobs. Passing fixtures does not qualify live installer transactions or release
trust provisioning.

## Performance Considerations

- E2E tests are slow (2-10 seconds each)
- Use `t.Parallel()` where possible
- Mock E2E is included by default; real Docker E2E is opt-in locally and required in CI
- Focus on critical paths and new features

## Debugging Failed Tests

When E2E tests fail:

1. **Check logs** - Server and agent log output
2. **Check ports** - Ensure no port conflicts
3. **Check cleanup** - Previous test may have left processes running
4. **Increase timeouts** - CI may be slower than local
5. **Run locally** - Reproduce outside CI environment

## Example: Complete E2E Test

```go
func TestWebSocketProxyComplete(t *testing.T) {
    // 1. Setup
    tmpDir := t.TempDir()
    serverPort := getFreePort(t)
    agentPort := getFreePort(t)
    
    // 2. Start server
    serverCmd := startServer(t, serverPort, tmpDir)
    defer serverCmd.Process.Kill()
    
    // 3. Wait for server ready
    if !waitForServer(t, serverPort, 5*time.Second) {
        t.Fatal("Server failed to start")
    }
    
    // 4. Start agent
    agentCmd := startAgent(t, agentPort, serverPort, tmpDir)
    defer agentCmd.Process.Kill()
    
    // 5. Wait for connection
    if !waitForAgentActive(t, serverPort, "test-agent", 5*time.Second) {
        t.Fatal("Agent failed to connect")
    }
    
    // 6. Test proxy
    resp := makeProxyRequest(t, serverPort, "test-agent", "/")
    defer resp.Body.Close()
    
    // 7. Verify
    if resp.StatusCode != 200 {
        t.Errorf("Expected 200, got %d", resp.StatusCode)
    }
    
    // 8. Cleanup (defers handle this)
}
```

## Resources

- Go testing: https://go.dev/doc/tutorial/add-a-test
- Integration testing: https://go.dev/wiki/TableDrivenTests
- Test fixtures: https://github.com/golang/go/wiki/TestFixtures
