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

### Coordinator pipeline (production)

#### Uploader wake foundation

The upload worker provides a nonblocking, one-slot coalescing `Wake()` capability
for successful local commits. A fixed one-second batching window prevents wake
storms from delaying uploads indefinitely. Periodic cadence remains unchanged;
a scheduled upload can satisfy the pending wake. The channel is never closed,
including shutdown, so late producers are safe. Stop cancels active delivery and
retry waits and joins loops; it does not guarantee a final flush. Use a fresh
worker instance after stopping. The scanner runtime wakes the uploader after each successful commit; see [delivery timing](/api/protocol/#upload-worker-wake-and-shutdown).

The scanner library has a pure typed planner and a bounded coordinator with
injected probe, SNMP query, commit and uploader-wake callbacks; production wiring
is described below. USB/spooler remains a separate physical-source adapter.

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
not the newly observed destination; liveness updates and moves require it. Other
devices still recorded at the destination address (DHCP reuse or a replaced
printer, including hidden or saved devices) are left unchanged; because liveness
requires a serial match, those stale records are never refreshed by the new
printer. Serials are opaque keys: separators,
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

## Related Documentation

- [Agent Module](/components/agent/historical-overview/) - Discovery protocols and detection logic
- [Logger Module](/components/logger/) - Logging system
- [API Reference](/api/) - HTTP endpoints using scanner

