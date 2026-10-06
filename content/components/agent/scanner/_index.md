---
title: "Scanner Module Documentation"
source: "agent/scanner/README.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

**Location**: `agent/scanner/`

The scanner module is responsible for device detection, SNMP querying, and printer information extraction. It provides a vendor-aware, configurable scanning system.

## Serial-label fallback (reviewed behavior)

The runtime discovery parser can extract a fallback serial from explicitly labeled
PDU text when a direct serial is unavailable. Accepted case-insensitive labels are
`SN`, `S/N`, `Serial`, `SerialNumber`, and `Serial Number`. The label must have word
boundaries and a nonempty separator of colon, equals sign, or whitespace before
the value: `SN:ABC123`, `S/N ABC123`, and `Serial Number: ABC123` are valid examples.
`SNMPv2` and `SN123456` are not labels; an invalid token does not hide a later valid
label in the same text.

The existing value matcher (4–40 ASCII letters/digits/hyphens) and UUID/OID/supply
model rejection remain unchanged. Direct serial OIDs, structured vendor device-ID
parsing, and the separate known-device liveness identity validator are unchanged.
An IP match alone does not establish serial identity. MIB-walk analysis tools have
separate legacy matchers and are outside this runtime correction.

Offline regression coverage exercises the production matcher without the full
parser's web-UI probes. See the [SNMP reference](/development/snmp-reference/#serial-label-fallback)
for the compatibility impact and reviewed implementation revision.

**Review scope:** this section covers only serial-label extraction. Historical
architecture/examples below still need reconciliation during pipeline consolidation;
no coordinator, stage-skip policy, persistence, or metrics-scheduling change is
implemented by this fix. The page's imported `sourceCommit` remains its original
provenance, not a claim that all content was re-reviewed.

## Architecture Overview

### Consolidation foundation (not yet wired into Agent startup)

#### Uploader wake foundation

The upload worker provides a nonblocking, one-slot coalescing `Wake()` capability
for successful local commits. A fixed one-second batching window prevents wake
storms from delaying uploads indefinitely. Periodic cadence remains unchanged;
a scheduled upload can satisfy the pending wake. The channel is never closed,
including shutdown, so late producers are safe. Stop cancels active delivery and
retry waits and joins loops; it does not guarantee a final flush. Use a fresh
worker instance after stopping. Scanner call-site migration is still pending in
the committed foundation; see [delivery timing](/api/protocol/#upload-worker-wake-and-shutdown)
for the narrowly reviewed scope and source revision.

The new scanner library has a pure typed planner and a bounded coordinator with
injected probe, SNMP query, commit and uploader-wake callbacks. This is a library
foundation, **not a claim that production discovery has migrated**. Existing
Agent endpoints, settings, responses and storage behavior are unchanged by adding
the library. USB/spooler remains a separate physical-source adapter.

Work follows reachability → identity → detail → optional metrics. Observations
contain target/source/raw hints, not completed stages. `KnownDeviceHint` is only
a hint: IP never establishes identity. Fresh identity reads validate an approved
serial OID or structured vendor ID against the expected serial. A conflicting
serial prevents attribution/commit; no cross-item identity cache exists. Later
detail may retain the same item's identity, never a contradictory serial.

`Do` ignores hints for reachability skipping. `DoSource` is reserved for an
actual source adapter's receipt callback; typed metadata is not authentication.
Skipping requires validated message shape and a target-bound local receipt at
most 30 seconds old. Zero/future receipts, malformed messages and indirect
advertised targets cannot satisfy reachability. Queued evidence is rechecked at
dispatch, but expiry cannot rewind an already running identity read. Adapters
must not invent fresh timestamps for cached hints. Failed TCP is not proof of
offline status; explicit policy can allow SNMP after TCP failure.

Quick/liveness request identity; full adds detail/metrics; live allows reuse of
essential enrichment; manual remains essential unless explicitly upgraded.
Metrics execute only when requested/due. All requested fields must be present
and fresh within the same item for reuse; zero is a valid obtained counter,
not a substitute for an absent field. Scheduling is outside the planner. Outcomes
distinguish not-checked, succeeded, negative, skipped with reason and failed.

The coordinator owns admission, bounded pending work, shared worker concurrency
and per-IP serialization. Exact active requests coalesce; compatible queued work
unions intents; active upgrades become fresh followups. One subscriber's cancel
does not cancel others; the last subscriber cancels its work. Saturation is an
explicit error. The owner closes/joins the coordinator; callbacks must honor
context cancellation and never close it recursively.

Read-only work never commits or wakes delivery. A successful injected local
commit precedes wake; delivery must not block scanner workers. Foundation logs
cover admission/coalescing, stages, identity conflicts, commit and shutdown;
serials, raw protocol payloads, credentials and backend error text are excluded.
Offline fake-backend tests and race tests cover these ownership contracts.

#### Partial persistence

The Agent SQLite store adds a staged scanner commit that writes only facts the
work item obtained, atomically: optional device patch, scan snapshot and metrics
snapshot. Absent or blank fields never erase stored data. Locked fields, user
notes/location/asset, visibility, saved state, classification and page-count
baselines are not scanner-patchable. Identity-only work records no scan history,
metrics or last-seen time; liveness-only work advances only last-seen.

Creating a device or changing its address requires a scanner-validated serial.
The expected address guards the **previously stored** address (compare-and-set),
not the newly observed destination; liveness updates and moves require it. If
any other serial—including hidden or saved devices—already holds the destination
address, the whole commit is rejected. Serials are opaque keys: separators,
control characters and surrounding whitespace are rejected rather than altered.

Metrics follow the existing snapshot drop rules (all-zero counters, decreases
over 5% with a minimum of 10, breakdown mismatches over 10% with a minimum of
100). A dropped sample does not roll back other facts; a fixed reason is logged.
Logs carry counts/reasons only, never serials, addresses or metadata. Upload wake
is permitted only after a successful commit.

#### Network source adapters

mDNS, SSDP, WS-Discovery, SNMP trap and LLMNR listeners now produce typed
observations that retain protocol evidence instead of a bare IP: mDNS service,
instance, host, port, TXT and addresses; SSDP USN, search/notification type,
location, sender and filter decision; WS-Discovery endpoint, types, scopes,
XAddrs and sender; trap version, type, trap/enterprise OIDs and varbinds; LLMNR
hostname, sender and answer. Only Printer-MIB or known-vendor traps are admitted.
WS-Discovery uses IPv4 XAddrs only; it never falls back to the sender address.

A local receipt time is attached only to target-bound, well-formed responses.
Announcements, LLMNR queries and URL-only targets carry no receipt and cannot
skip TCP reachability; the coordinator revalidates every hint. Each listener
delivers observations serially from one owner goroutine, throttles each IP for
10 minutes after accepted submissions, and stops/joins its sockets on
cancellation. Local socket/setup errors are logged; packet contents are not.
Legacy IP-only entry points remain only until production wiring migrates.

**Review scope:** planner/coordinator library, staged storage commit and source adapters only.
Production wiring of these pieces requires a separate completed slice. Historical
examples below are not the new library's API. The original imported `sourceCommit`
does not certify this whole page; the paired source revision is recorded in the
[SNMP reference](/development/snmp-reference/#consolidation-foundation-trust-boundary).

```
scanner/
├── detector.go          # Device type detection (IsPrinter? confidence scoring)
├── pipeline.go          # Multi-stage scan orchestration (liveness → detection → deep scan)
├── query.go             # SNMP query execution and vendor-specific data collection
├── snmp.go              # Low-level SNMP communication wrapper
├── enumerator.go        # IP range enumeration and subnet handling
└── vendor/              # Vendor-specific OID profiles and parsers
    ├── hp.go
    ├── canon.go
    ├── brother.go
    ├── epson.go
    ├── kyocera.go
    ├── lexmark.go
    ├── ricoh.go
    ├── samsung.go
    ├── xerox.go
    ├── generic.go       # Fallback standard Printer-MIB
    └── registry.go      # Vendor detection and module selection
```

## Core Components

### Detector (`detector.go`)

**Purpose**: Determine if a device is a printer and calculate confidence score.

**Key Functions**:
- `IsPrinterDevice(ctx, ip, timeout) (bool, float64, error)`: Fast printer detection
- Checks multiple signals:
  - Open printer ports (9100 JetDirect, 631 IPP, 515 LPD)
  - SNMP sysObjectID matches known printer enterprise IDs
  - Presence of Printer-MIB OIDs
  - HP/Canon/Brother-specific OIDs
- Returns confidence score 0.0-1.0

**Example**:
```go
isPrinter, confidence, err := IsPrinterDevice(ctx, "192.168.1.100", 5)
if isPrinter && confidence > 0.7 {
    // High confidence this is a printer
}
```

### Query System (`query.go`)

**Purpose**: Execute SNMP queries and extract structured printer information.

**Key Functions**:
- `QueryDevice(ctx, ip, community, timeout) (*PrinterInfo, error)`: Main query function
- Vendor auto-detection via sysObjectID
- Builds OID list from vendor module + generic Printer-MIB
- Executes SNMP WALK/GET operations
- Parses results using vendor-specific parsers

**Query Flow**:
1. Initial SNMP GET for sysDescr + sysObjectID
2. Detect vendor from enterprise OID (e.g., HP = 1.3.6.1.4.1.11)
3. Load vendor module (hp.go, canon.go, etc.)
4. Build combined OID list (vendor + generic)
5. Execute SNMP WALK for all OIDs
6. Parse results with vendor parser
7. Fallback to generic parser for unknown vendors

### Pipeline (`pipeline.go`)

**Purpose**: Orchestrate multi-stage scanning with worker pools.

**Stages**:
1. **Liveness**: Fast TCP/ICMP checks (100-200 workers)
2. **Detection**: SNMP-based printer identification (20-50 workers)
3. **Deep Scan**: Full SNMP walks + metrics (3-10 workers)

**Key Functions**:
- `ScanRange(ctx, cidr, config) ([]PrinterInfo, error)`: Scan entire subnet
- `ScanIPs(ctx, ips, config) ([]PrinterInfo, error)`: Scan specific IPs

**Benefits**:
- Reduces wasted work (don't deep-scan non-printers)
- Configurable concurrency per stage
- Bounded resource usage
- Context-based cancellation

### Vendor System (`vendor/`)

**Purpose**: Vendor-specific OID profiles and data parsing.

**Interface** (`VendorModule`):
```go
type VendorModule interface {
    Name() string
    GetOIDs() []string
    ParseMetrics(pdus []gosnmp.SnmpPDU) map[string]interface{}
}
```

**Vendor Modules**:
- **HP** (`hp.go`): Extended metrics (job accounting, fax pages, ADF scans)
- **Canon** (`canon.go`): Canon-specific counters and status
- **Brother** (`brother.go`): Brother drum life, toner levels
- **Epson** (`epson.go`): Epson ink tank levels
- **Kyocera** (`kyocera.go`): Kyocera maintenance counters
- **Lexmark** (`lexmark.go`): Lexmark enterprise OIDs
- **Ricoh** (`ricoh.go`): Ricoh/Savin/Lanier shared OIDs
- **Samsung** (`samsung.go`): Samsung-specific metrics
- **Xerox** (`xerox.go`): Xerox FreeFlow OIDs
- **Generic** (`generic.go`): Standard Printer-MIB fallback

**Vendor Detection** (`registry.go`):
```go
func DetectVendor(sysObjectID string) VendorModule
```
Maps enterprise OIDs to vendors:
- `1.3.6.1.4.1.11.*` → HP
- `1.3.6.1.4.1.1602.*` → Canon
- `1.3.6.1.4.1.2435.*` → Brother
- etc.

### SNMP Wrapper (`snmp.go`)

**Purpose**: Low-level SNMP communication abstraction.

**Key Functions**:
- `SNMPGet(target, community, oids, timeout) ([]gosnmp.SnmpPDU, error)`
- `SNMPWalk(target, community, oid, timeout) ([]gosnmp.SnmpPDU, error)`
- `SNMPBulkWalk(target, community, oid, maxReps, timeout) ([]gosnmp.SnmpPDU, error)`

**Features**:
- Retry logic with exponential backoff
- Configurable timeouts
- Error handling and logging
- Thread-safe connection pooling

## Configuration

Scanner behavior is controlled via `ScannerConfig` struct in `main.go`:

```go
type scannerConfigStruct struct {
    SNMPTimeoutMs        int  // SNMP timeout in milliseconds (default: 2000)
    SNMPRetries          int  // SNMP retry count (default: 1)
    DiscoverConcurrency  int  // Max concurrent scan workers (default: 50)
    sync.RWMutex              // Thread-safe access
}
```

Settings are loaded from:
1. `config.json` (static config file)
2. SQLite database (via Settings UI)
3. Defaults if not specified

## Usage Examples

### Simple Single Device Query

```go
ctx := context.Background()
pi, err := scanner.QueryDevice(ctx, "192.168.1.100", "public", 5)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Found printer: %s %s (Serial: %s)\n", pi.Vendor, pi.Model, pi.Serial)
```

### Range Scan with Pipeline

```go
config := &scanner.ScanConfig{
    SNMPCommunity: "public",
    Timeout:       5,
    Concurrency:   50,
}

printers, err := scanner.ScanRange(ctx, "192.168.1.0/24", config)
for _, p := range printers {
    fmt.Printf("%s: %s %s\n", p.IP, p.Vendor, p.Model)
}
```

### Vendor-Specific Query

```go
// Auto-detects vendor from sysObjectID
pi, _ := scanner.QueryDevice(ctx, "10.0.0.50", "public", 5)

// Access vendor-specific metrics
if pi.Vendor == "HP" {
    fmt.Printf("Job Accounting Pages: %d\n", pi.ExtendedMetrics["JobAccountingPages"])
    fmt.Printf("Fax Pages: %d\n", pi.ExtendedMetrics["FaxPages"])
}
```

## Testing

**Test Files**:
- `detector_test.go`: Device detection and confidence scoring (8 tests)
- `query_test.go`: SNMP query and vendor parsing (21 tests)
- `pipeline_test.go`: Multi-stage pipeline orchestration (5 tests)

**Run Tests**:
```powershell
cd agent
go test ./scanner/... -v
```

**Test Coverage**:
```powershell
go test ./scanner/... -cover
```

## Performance Characteristics

### Timing (per device)

| Stage | Duration | Notes |
|-------|----------|-------|
| Liveness (TCP) | 100-500ms | Fast port checks |
| Detection (SNMP) | 500ms-2s | Limited OID query |
| Deep Scan (SNMP) | 2-10s | Full walk with retries |

### Concurrency Limits

| Stage | Default Workers | Tuning Notes |
|-------|----------------|--------------|
| Liveness | 100-200 | I/O bound, can be high |
| Detection | 20-50 | Network + SNMP processing |
| Deep Scan | 3-10 | Expensive, limit to prevent overwhelming devices |

### Memory Usage

- ~1KB per discovered device (in-memory PrinterInfo)
- ~5-10MB for SNMP library overhead
- Scales linearly with concurrent workers

## Error Handling

**Common Errors**:
- `context.DeadlineExceeded`: SNMP timeout
- `no such host`: Invalid IP or DNS failure
- `connection refused`: SNMP disabled on device
- `no response`: Firewall blocking UDP 161

**Retry Strategy**:
- SNMP queries: Retry once with exponential backoff
- TCP probes: No retry (fail fast)
- Pipeline stages: Continue on individual device failures

## Integration Points

### With Agent Package (`agent/agent/`)

Scanner is called by:
- `Discover()` in `detect.go`: Full network scan
- `LiveDiscoveryDetect()` in `scanner_api.go`: Single device enrichment
- Live discovery handlers (mDNS, SSDP, WS-Discovery)

### With Storage (`agent/storage/`)

Results are persisted via:
- `UpsertDevice()`: Save/update discovered printer
- `GetDevices()`: Retrieve all stored printers
- `DeleteDevice()`: Remove printer from database

### With Logger (`agent/logger/`)

Scanner logs to structured logger:
- Info: Discovery progress, device found
- Warn: SNMP failures, timeout warnings
- Error: Critical failures, configuration errors
- Debug: Detailed SNMP PDU parsing

## Future Enhancements

### Planned Features
- [ ] SNMPv3 support with authentication/encryption
- [ ] Bulk GET for improved performance
- [ ] Result caching with configurable TTL
- [ ] Dynamic OID discovery via MIB walking
- [ ] Parallel vendor module querying

### Performance Improvements
- [ ] Connection pooling for SNMP clients
- [ ] Adaptive timeout based on network latency
- [ ] Progressive OID querying (core → extended)
- [ ] Background re-scan of changed devices

## Troubleshooting

### No Devices Found
1. Check network connectivity: `ping <device_ip>`
2. Verify SNMP enabled on printer
3. Test SNMP manually: `snmpwalk -v2c -c public <device_ip> .1.3.6`
4. Check firewall allows UDP 161 outbound

### Incomplete Data
1. Increase SNMP timeout in settings
2. Check vendor module supports printer model
3. Review logs for parsing errors
4. Try generic fallback (disables vendor detection)

### Slow Scans
1. Reduce concurrency if network is saturated
2. Lower SNMP timeout for faster failures
3. Use liveness pre-filtering to skip dead IPs
4. Limit scan range to active subnets

## Related Documentation

- [Agent Module](/components/agent/historical-overview/) - Discovery protocols and detection logic
- [Logger Module](/components/logger/) - Logging system
- Settings TODO (legacy document unavailable) - Unimplemented scanner features
- [API Reference](/api/) - HTTP endpoints using scanner

