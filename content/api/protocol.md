---
title: Agent↔Server Protocol
description: Machine enrollment, heartbeat, uploads, updates, and WebSocket boundary.
weight: 30
---

Machine endpoints are hosted on the **Server** and consumed by Agents. They are distinct from both the Server's user-session integration API and the Agent's local API. This page is a verified route/authentication overview, **not a complete payload contract** or AsyncAPI specification.

Route overview originally reviewed at `eeb6259f6060c0534798e3d14ac0cd9d289df9a7`. Ownership/auth additions below were reviewed at [committed hardening revision 864fc3e](https://github.com/Printmaster-Org/printmaster/tree/864fc3ee040bbb28f25d779c69512c5b6999d421). Historical links below retain the baseline route/client provenance; the security guides identify the containing hardening revision. Neither source snapshot is a product release claim.

## Route families

For pinned 0.31.0/0.31.1 update contracts and current mixed-version fail-closed
behavior, see [legacy and long-offline migration](/guides/update-migration/).
Those protocol fixtures do not qualify historical installers or retroactively
give old Agents independent publisher trust.

| Server route | Purpose | Authentication boundary |
| --- | --- | --- |
| `/api/v1/agents/register` | Disabled legacy registration | POST returns `403` JSON directing callers to join-token enrollment; no anonymous token issuance |
| `/api/v1/agents/register-with-token` | Join-token enrollment | Join token validated by registration handler |
| `/api/v1/agents/heartbeat` | Machine liveness | Agent bearer token, not user session |
| `/api/v1/devices/batch` | Device uploads | Agent bearer token |
| `/api/v1/metrics/batch` | Metrics uploads | Agent bearer token |
| `/api/v1/agents/device-credentials` | Agent credential retrieval | Agent bearer token; sensitive operation |
| `/api/v1/agents/device-metadata` | GET authoritative pin snapshot; POST explicit managed-Agent metadata edits | Agent bearer token; current device ownership checked |
| `/api/v1/agents/update/manifest` | Update manifest | Agent bearer token |
| `/api/v1/agents/update/download/…` | Update artifact | Agent bearer token |
| `/api/v1/agents/update/metadata/…` | Unchanged public publisher TUF metadata (unreleased) | Agent bearer token; not a user-session credential |
| `/api/v1/agents/update/telemetry` | Update telemetry | Agent bearer token |
| `/api/v1/agents/ws` | Persistent channel | WebSocket handler's token handshake |

Sources: [server route registrations](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/main.go), [join-token handlers](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/tenancy/handlers.go), [HTTP client](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/agent/agent/server_client.go), [WebSocket implementation](https://github.com/Printmaster-Org/printmaster/blob/eeb6259f6060c0534798e3d14ac0cd9d289df9a7/server/websocket.go).

## Credentials are not interchangeable

- **Join token:** bootstrap enrollment; not a user login or permanent fleet API credential.
- **Agent token:** machine uploads/heartbeat; does not grant a Server user session.
- **Server session:** user API/UI access using bearer or `pm_session`.
- **Agent session:** local Agent access using `pm_agent_session`.

Use HTTPS/WSS with trusted certificates. Review enrollment handlers and configuration before making those routes reachable externally. Do not publish token values, printer credentials, or production payload dumps.

Device-code approval and machine-bound user login are separate boundaries. See [authentication and enrollment boundaries](/guides/authentication-boundaries/) for tenant/role policy, explicit-only OIDC linking, supported target-bound password/OIDC redirects, required validator ownership fields, serialized device approval, and transactional pending-review token issuance. Hardened validation rejects unbound grants; no machine protocol-version bump is implied. These auth operations remain outside the reviewed read-only OpenAPI subsets.

The [machine ownership safeguards](/api/machine-ownership/) describe atomic storage checks, WebSocket sender binding, async metrics ordering and implemented authenticated-identity binding for HTTP uploads. Existing Agent IDs are not replaced by join-token enrollment; batch success can be partial (`received` versus `stored`). The [tenant-isolation guide](/guides/tenant-isolation/) records combined implementation, compatibility and limitations without expanding this payload-contract scope.

## Ordered update progress (unreleased)

Implemented at [source commit 946bf99](https://github.com/Printmaster-Org/printmaster/commit/946bf990e668d1053b71fa5eb6c1873980b37ef7).
Review covers the Agent journal/restart lifecycle, authenticated progress
ingestion/storage/replay and Agent/Fleet UI ordering, not release download or
signing enforcement.

Updated Agents publish `update_progress` WebSocket messages with a durable
snapshot. They also replay the latest snapshot as the optional `update_progress`
object in `POST /api/v1/agents/update/telemetry` during their heartbeat cycle.
Both paths use the authenticated Agent identity. HTTP `agent_id` must match the
bearer token's Agent (`403` on mismatch; `401` without machine authentication).
Malformed JSON/field types or invalid snapshot fields return `400`; persistence
failure returns `500`. Successful, duplicate and stale submissions return
`200` with `{"success":true}`; success acknowledges processing, not installation.

The snapshot contains `run_id`, `run_started_at` (UTC timestamp), `sequence`
(positive integer within that run), `status`, `progress` (-1 for unknown or
0-100), `message`, `updated_at`, and optional `target_version` and `error`.
New runs have increasing millisecond-resolution `run_started_at` values, even
if the Agent clock moves backwards relative to its persisted journal.
Same-run events require a higher sequence number. Terminal states (`idle`,
`succeeded`, `failed`, `skipped`, `rolled_back`, `cancelled`) cannot be reopened
by a later same-run event.

The Server atomically stores accepted snapshots before broadcasting them to
authorized SSE subscribers. Existing user-session Agent list (legacy and
paginated) and detail responses expose the optional `update_progress` snapshot
within their existing role/tenant scope. Browser refresh and SSE reconnection
read these snapshots; Agent heartbeat replay repairs missed delivery.
Legacy unsequenced progress is still supported until an Agent has reported an
ordered snapshot; it cannot overwrite an ordered run afterward.

The Agent records the pending target/run before installation handoff and carries
that run across restart. `restarting` is not success. `verifying` checks the
running version, followed by `succeeded` at 100% or `failed` on mismatch. A
reconnect alone cannot complete an update. This is version validation, not
independent health supervision or automatic rollback.

The unreleased [update-progress UI](/guides/updates/) keeps these installation
phases distinct, retains failure diagnostics and marks active observations
unknown after two minutes without newer progress. This does not change the
snapshot schema or turn a browser timeout into a terminal Agent result.
Legacy unsequenced completion cannot prove hardened validation. Manual
Server cache-sync status is a separate administrator/user-session API described
in that guide, not an Agent machine-token operation.

These are additive fields on existing routes/messages, not new routes or a
machine-protocol-version bump. The machine telemetry write and Agent-local
update-status API remain outside the reviewed read-only OpenAPI subsets. The
Server read-only contract documents the optional list-response snapshot only.

## Next contract work

### Artifact delivery reliability (unreleased)

Implemented at [source commit 1765ea9](https://github.com/Printmaster-Org/printmaster/commit/1765ea9f60fcc0011b7d0e018a0c2c4c4bd1c731).

Agent artifact downloads use a separate 15-minute transfer budget, preserving
the shorter metadata-request timeout. Downloads remain bound by their caller's
deadline. The URL and redirects must stay on the authenticated Server origin;
Agent credentials are not forwarded to a publisher/mirror supplied in a
manifest. The Server remains responsible for fetching upstream artifacts.

Updated Agents require a positive artifact size, check full-response lengths
and resumed `Content-Range` start/end/total, and count resumed bytes in progress.
An ignored Range request restarts the file instead of appending. Truncated or
oversized responses fail. Completed partials are hash-checked before reuse;
invalid partials are discarded. SHA-256 verification precedes promotion from
the partial download to the staged artifact.

Manifest selection now checks the cached file's size and SHA-256 and rejects
missing, corrupt or manifest-inconsistent entries. An older valid cached release
may remain selectable under the existing channel/version policy. Sync repairs
invalid cache entries and regenerates manifests when their signed size/hash,
source URL or publication time changes. No new request fields are required:
legacy channel and omitted-format requests retain their existing shapes.

Release intake rejects incorrect upstream sizes before publishing its temporary
download. Scheduled and manual intake cannot mutate the cache concurrently;
each sync has a one-hour deadline. Individual artifact/manifest failures produce
an error outcome, not a successful 100% completion, and successful artifacts
remain cached for the next retry.

These transport checks alone are integrity/reliability work, not publisher
authentication. Mandatory TUF authorization is implemented below; production
trust provisioning/activation and protected installation remain release gates.

### Bounded existing installer commands (unreleased)

Implemented at [source commit 23d51cb](https://github.com/Printmaster-Org/printmaster/commit/23d51cbaaee1969ae67ab3d390df646ea4515068).

APT/DNF/YUM subprocesses now have a ten-minute budget per command and use
noninteractive `sudo -n`; captured output is limited to the last 64 KiB.
Failures log command, elapsed time and deadline. Linux cancellation signals the
process group rather than only the immediate child. Permission failures while
signalling elevated descendants remain possible and are not independent recovery.
The systemd restart request has a 30-second budget and must return successfully;
failure is reported instead of exiting in the hope that service recovery works.

The Windows raw-binary helper stops waiting after approximately 120 seconds if
the service never stops, without copying over a still-running executable.
This does not supervise startup or independently repair the Agent. MSI execution
and helper-to-Agent failure reconciliation still need further work; no MSI
deadline or watchdog guarantee is claimed by this slice. Interrupting a package
manager can leave package state requiring repair.

### Required publisher authorization (unreleased)

Implemented at [source commit 56e05f4](https://github.com/Printmaster-Org/printmaster/commit/56e05f4f48e82074b870139ec326af48f6c37139).

The Agent updater now requires an independently configured publisher verifier
before accepting a Server-selected candidate and again before executing it.
Missing trust or failed TUF authorization returns an explicit manifest error;
it does not fall back to legacy signature fields. Component, OS, architecture,
format and the operation's intended channel must match the authorized target.
This changes the client's acceptance behavior, not the manifest route/schema
or machine protocol version. Existing Server signatures do not establish
independent publisher authority.

The implemented startup wiring constructs the verifier from an embedded public-root file
and authenticated metadata transport. That file intentionally remains
unprovisioned (`null`), so **current default builds still reject offered update
candidates**. Do not deploy them to remote sites relying on another unattended
upgrade until real root provisioning, signed publishing and the remaining
installation gates are complete. Agent runtime operation and
post-restart version validation remain available. APT/DNF/YUM installations are
blocked until actual package bytes, not merely discovery binaries, are
authenticated. See the [runtime authorization slice](/development/auto-update-plan/#resumed-slice-runtime-publisher-authorization-boundary-2026-10-19).

### Application selection and installation descriptors (unreleased)

Reviewed implementation:
[3b76a8f](https://github.com/Printmaster-Org/printmaster/commit/3b76a8fd6a4b22d87b99c9c8d3bd26a21218a22a).
This changes Agent-side selection/handoff behavior, not routes, credentials,
message envelopes or the reviewed OpenAPI subsets.

The Agent resolves/fixes its channel once per operation and always sends the
existing optional `explicit_channel: true`; the Server must not replace it with
another managed selection mid-operation. Managed changes apply on the next run.
This is compatible with the existing manifest route/envelope; no manifest
sequence supplied by the Server is trusted.

Force/`install_channel` bypass maintenance timing, not publisher trust, pins,
upgrade restrictions, or application downgrade policy. Older versions are
rejected, including a channel switch to older Stable. Invalid/unorderable
versions/pins fail explicitly with progress/telemetry `APPLICATION_POLICY`.
Scheduled pin exclusions and equal-version checks remain no-op. A manual
same-version reinstall must match installed raw-binary bytes or a previously
recorded authenticated MSI identity.

New publisher targets carry signed TUF
`custom.printmaster_release_sequence`, immutable per release identity and
increasing within component/channel/platform/architecture/format. Same-line Dev
changes require authentication of the installed Dev bytes and a strictly newer
candidate sequence. Server publication times, commit-hash lexical order and
fresh TUF timestamp versions do not establish application ordering. Legacy Dev
targets lacking ordering require owner-managed migration; metadata freshness
refresh does not backfill/promote old targets.

Local pending state now includes an installation descriptor binding the run,
from-version, exact authorized target/sequence, staging/destination/backup paths
and previous artifact length/hash. It is a local receipt, **not a new
Server-signed instruction format or independent trust authority**. Final apply
rechecks authorization/policy and all artifact identities; Windows helpers
check embedded expected staged length/hash before copy/MSI execution.
Failed synchronous apply may restore only that run's hash-verified previous
backup, not an arbitrary older release. Binary startup checks installed bytes
before retaining the descriptor as an installation receipt. Legacy version-only
pending journals are still reconciled without authorizing a new installation.

Protected ACLs/paths, verification-to-use races and durable detached-helper/MSI
outcomes remain open. These checks do not establish universal automatic
rollback or health-gated recovery. Production trust stays unprovisioned.
See the [policy scope and next gates](/development/auto-update-plan/#application-policy-and-installation-descriptors-unreleased).

### Publisher metadata delivery (unreleased)

Implemented at [source commit ec0735c](https://github.com/Printmaster-Org/printmaster/commit/ec0735c457a84cdb0b865a494086c7276f9eee83).

`GET /api/v1/agents/update/metadata/{name}` is a machine-authenticated Server
route. It does not accept an Agent ID or user-selected tenant: public publisher
metadata is shared across authenticated Agents. User-session tokens do not
grant machine access. It is outside the read-only user/Agent-local OpenAPI
subsets; this addition does not bump the machine protocol version.

Allowed names are `timestamp.json` and positive signed-64-bit decimal versions
without leading zeroes followed by `.root.json`, `.targets.json` or
`.snapshot.json`. Nested paths, local metadata/checkpoint files, signing keys,
unversioned root/targets/snapshot and delegated-role names are not served.
Only the top-level consistent-snapshot repository layout is supported.

The Server reads only the configured `[releases].publisher_metadata_dir` public
mirror (environment override `RELEASES_PUBLISHER_METADATA_DIR`, default empty).
It confines file access to that directory with `os.OpenRoot`, requires regular
files and buffers at most 16 MiB plus the overflow-detection byte. It checks
cancellation around the read with a 30-second context budget; this is not an
OS-level deadline for a stalled filesystem operation. The Agent's TUF refresh
retains its two-minute overall context budget, shorter role-specific library
size limits and the Server client's HTTP timeout.

Success is `200 application/json`, exact file bytes, `Cache-Control: no-store`
and `X-Content-Type-Options: nosniff`. There is no JSON reserialization, signature
replacement, metadata synthesis, directory listing or fallback to cached
Server-signed manifests. Non-GET returns `405` with `Allow: GET`; invalid names
return `400`; missing/invalid machine authentication returns `401`; missing
files return `404` (including the next root-version probe); an unconfigured or
unopenable mirror returns `503`; invalid/oversized files and read failures
return `500`. Error responses never authorize updates. Unexpected delivery
failures use structured Server logs; routine next-root `404` is not an error.

The Agent preserves its configured TLS transport/CA policy, attaches the current
Agent bearer token on each request, and refuses requests/redirects outside the
configured Server origin or supported metadata path. A supplied Server root or
signing key never replaces the embedded root. This route distributes trust
evidence; it is not itself a signing authority or a guarantee of availability.

Mount/copy **only public metadata** from the publisher to the Server read-only;
never mount the private signing workspace. Publish retained immutable versioned
metadata before replacing `timestamp.json`. Automated distribution, signing,
freshness scheduling and alerting remain release work.

### Inventory and status with metrics

Device batches retain the uploaded common inventory fields (including asset
number, location, description, Web UI URL, network fields, consumables and status
messages) and store `raw_data` directly rather than nesting the entire upload
envelope. Uploaded inventory edits also refresh existing rows. Current
capabilities, tray data and complete parsed vendor metadata are retained there.
New device ownership and metric source attribution come from the authenticated
Agent; uploaded per-record Agent IDs are not trusted. Existing-device inventory
remains management-owner controlled. Same-tenant secondary discoveries are
acknowledged without replacing inventory; see shared telemetry below.

The Server retains per-device observation times and per-sample metric timestamps;
the batch timestamp is only a fallback for missing times. Batch record fields
are decoded into the corresponding typed device/metrics structures; malformed
field types reject the request rather than silently dropping those fields.
The `received`/`stored` counts retain their meaning; metrics receipts now
explicitly identify rejected records as described below.

Regular Agent metrics polls also collect alert descriptions and vendor status.
A successful local staged commit refreshes current device metadata before
waking delivery; each upload cycle sends devices before latest metrics. Decoded
Epson status or a zero-error standard error-state bitfield can clear resolved
status messages. Missing/failed status leaves prior state intact. Fresh Epson
status clears obsolete error/warning keys without discarding other vendor facts.
Historical metrics continue storing counters and supply levels, including
distinct ink cartridges and maintenance boxes; richer current status/vendor
facts live in inventory metadata, not a new historical series.

This is a compatible correction to existing authenticated HTTP batch routes,
not a protocol-version change or expansion of either read-only OpenAPI subset.
It does not guarantee immediate delivery while an Agent is disconnected.

Reviewed at [source commit f22f20d](https://github.com/Printmaster-Org/printmaster/commit/f22f20da2c8226376bae6929a8fafa09ee325e6f),
limited to inventory/metrics ingestion, local staged persistence, upload payloads
and related regression tests. This is not a live-printer or whole-protocol audit.

### Metrics batch receipts

`POST /api/v1/metrics/batch` retains Agent bearer-token authentication. The
payload `agent_id` must match the authenticated Agent (`403` otherwise);
missing/invalid machine authentication returns `401`. Malformed JSON or
incorrect field types return `400`. A decoded, authenticated batch returns
HTTP `200`, including partial and fully rejected batches.

```json
{
  "success": false,
  "received": 2,
  "stored": 1,
  "failures": [
    {"index": 1, "serial": "EXAMPLE-2", "code": "ownership_conflict"}
  ]
}
```

- `success` is true only when all received snapshots were stored.
- `received` counts all submitted entries, including null/invalid entries.
- `stored` counts successful persistence operations.
- `failures` is omitted on complete success. Otherwise it lists each rejected
  entry in input order, with a zero-based `index`, optional submitted `serial`,
  and one of these codes:

| Code | Meaning |
| --- | --- |
| `invalid_record` | Null snapshot or missing/empty serial |
| `ownership_conflict` | Storage ownership guard rejected the snapshot; missing and foreign-owned devices are deliberately indistinguishable |
| `storage_error` | Other persistence failure; internal database details remain in Server logs, not the response |

An empty batch succeeds with both counts zero. The Server continues processing
after individual failures; accepted snapshots are not rolled back.

The updated Agent validates receipt counts against its submitted batch, checks
`success`, and retains failure details in its upload error. Partial or rejected
receipts do not advance either the client or worker's last successful metrics
upload time. Acknowledged rejections skip immediate whole-batch backoff retries:
accepted snapshots may already exist. Normal upload cycles still run and send
the latest local snapshots. This is not a per-record historical retry queue,
snapshot deduplication, or an exactly-once guarantee. Network/HTTP failures keep
the existing retry policy.

**Mixed versions:** New Agents detect partial receipts from older Servers using
`stored < received`, even when those Servers return `success: true` and no
failure details. Old Agents ignore these details and may still log HTTP `200`
as upload success; update both binaries for end-to-end diagnostics. Third-party
consumers must treat metrics `success` as complete persistence rather than mere
request processing. Device-batch receipt semantics are unchanged. These machine
operations remain outside the reviewed user-session and Agent-local OpenAPI
subsets; no HTTP-route, product or machine protocol version is changed.

The receipt prerequisite did not relax ownership checks. The subsequent shared
telemetry slice below permits same-nonempty-tenant reporters. Idempotent storage
and safe Agent retirement remain separate lifecycle work.

Receipt behavior is implemented at
[source commit 6c189d0](https://github.com/Printmaster-Org/printmaster/commit/6c189d08dd296420642ed31c882e772934ea963e).
Focused Agent client/worker tests and authenticated Server batch/ownership
regressions passed. This slice does not change database schemas or claim a new
PostgreSQL integration run, whole-fleet deployment or released binary.

### Shared telemetry within a tenant

Any authenticated Agent in the device management owner's **same nonempty
tenant** can upload metrics for an existing serial. The storage predicate and
insert execute together. The actual reporting Agent remains `agent_id` on each
metric; payload IDs cannot impersonate another source. Cross-tenant, unknown
Agent, missing-device and secondary unassigned-Agent writes are rejected.
Exact-owner reporting remains compatible for legacy unassigned Agents.

Site membership does not authorize or prohibit telemetry in this slice. Devices
do not yet have an independent site assignment, so sharing a site is not
required and empty/different Agent site selections do not block same-tenant
reporting. Do not use this feature as a device-level site permission boundary.

A secondary same-tenant device upload is acknowledged without replacing the
management owner's inventory, address, status, saved state or metadata pins.
It may advance `last_seen` with a newer observation, never regress it, so a
replacement observer can keep a device fresh without taking over management.
It counts in the device batch's `stored` acknowledgment count, but does not
create another device or change management ownership. New serials are created
under the reporting Agent as before. SSE inventory notifications use persisted
inventory, never the secondary upload's uncommitted claims.

Metric/latest/history/bounds, progressive inventory, legacy list enrichment and
tenant reports accept eligible same-tenant observations. Device/report Agent
and site filters still select devices by their **management owner**, not by
which Agent reported the metrics. Metric `agent_id` identifies the source and
may differ from inventory `agent_id`. Management, credentials, explicit metadata
editing and deletion remain owner-bound. Current tenant assignments determine
metric eligibility; there is no historical tenant-ownership ledger.

For fleet counter-delta aggregation, printers with multiple eligible historical
reporters use a **per-counter high-water mark**. Baselines include eligible
observations before the requested window. Stale lower counters and repeated
observations cannot lower that baseline or inflate usage when another reporter
catches up. First observations establish a baseline rather than counting lifetime
totals as new usage. Shared-printer real resets conservatively contribute no
usage until counters exceed their previous high-water marks. This can undercount
after resets; explicit reset/epoch tracking is deferred. Single-reporter reset
behavior is unchanged. Latest supplies/counters remain the freshest eligible
snapshot, not the high-water mark; device fleet totals count each serial once.
Historical report endpoint differences retain their existing calculation; the
high-water policy applies to fleet hourly delta series.

The original Agent can be offline or permanently disconnected: a newly
enrolled same-tenant Agent can continue metrics without its participation.
**Retain the original Agent record.** Deleting Agents still has database cascade
relationships to owned devices/history. This slice is not an ownership-transfer,
retirement or history-preservation migration. Serial identity remains globally
unique, not tenant-composite. Duplicate uploads may still occupy history rows;
this is not exactly-once persistence or coordinated scanner scheduling.

No payload, route, product or machine protocol version changes are required.
Upgrade the Server for shared ingestion/reads, and the Agent for the preceding
receipt diagnostics. No UI setting or site configuration enables this policy.

Implemented at
[source commit 73ab726](https://github.com/Printmaster-Org/printmaster/commit/73ab7263263e53a04715b48dcb635ff2cafe1a37).
All 16 Server packages passed, including five-reporter/extra-device overlap,
disconnected-owner replacement, authenticated upload/tenant isolation,
inventory/history/bounds, report source scope, liveness monotonicity and
single/shared counter-reset regressions. PostgreSQL integration fixtures compile;
runtime execution is pending because the Docker daemon is unavailable.
Race testing is also pending (local Go has CGO disabled and no C compiler).
These limits are not a production deployment or PostgreSQL validation claim.
The Server contract records the limited read-semantic follow-up separately in
`x-telemetry-reviewed-commit` and each affected `x-source.telemetry-commit`;
baseline operation/schema provenance and contract 0.3.0 remain unchanged.

### Server-owned device metadata

`GET /api/v1/agents/device-metadata` returns a JSON array (including `[]` when
empty) for devices currently owned by the authenticated Agent. Each record has
`serial`, a positive monotonically increasing `version`, and an `overrides`
object. DNS values are arrays of IP-address strings; all other supported values
are strings. Blank strings and empty DNS arrays are intentional pins. Empty
override objects convey unpin versions. Internal owner/reported values are not
included. Client-supplied Agent identity cannot select another owner's records.

`POST` accepts an explicit edit object, for example
`{"serial":"EXAMPLE","location":"Reception","dns_servers":["192.0.2.53"]}`.
Supported fields are manufacturer, model, hostname, firmware, IP, MAC address
(`mac_address`), subnet mask, gateway, DNS servers, DHCP server, asset number,
location, description and Web UI URL, using their snake_case JSON names.
The serial identifies the device and cannot be edited. The body limit is 64 KiB.
Unknown fields, wrong types, null edit values, invalid IP/DNS addresses and
requests without edits return `400`; a nonexistent device returns `404`.
Missing/invalid machine authentication returns `401`; another owner's device
returns `403`. An existing Server pin or atomic ownership conflict returns `409`,
with no partial multi-field edit. Success returns the authoritative record.
Storage/service failures return explicit `5xx` responses.

Server UI `POST /devices/update` now saves overrides locally, without requiring
an online Agent. `POST /devices/unpin` accepts `{"serial":"EXAMPLE","field":"location"}`.
Both use the existing Server user-session, tenant and operator/admin permission
boundary; viewers cannot edit/unpin. Successful responses contain `status`,
`metadata` (the authoritative record) and `device` (the refreshed effective row).
These write operations remain outside the reviewed read-only OpenAPI subsets.

Managed Agent `/devices/update` submits unpinned-field edits through the machine
endpoint, then caches the returned pins without creating local locks. An
unreachable Server returns `503`: no local-only edit, offline queue or replay.
Cached pins survive offline periods and restart. Each heartbeat attempts an
authenticated full snapshot reconciliation; missing records release old cached
pins, stale record versions cannot replace newer ones, and malformed responses
fail without clearing the cache. Explicit Server disconnect releases cached pins.
Synchronization is not instantaneous, and existing open Agent modals may need
refreshing; backend conflict checks remain authoritative.

SQLite and PostgreSQL retain effective values separately from reported values.
Uploads refresh reports beneath pins without replacing effective values; Agent
uploads reconstruct reports rather than echoing cached overrides. Unpin restores
the latest retained report. Manual edits/locks do not advance printer observation
times or change saved/visible state, counters or status. Historical Agent-local
locks are not automatically promoted to Server pins.

Upgrade both binaries for the new managed-edit flow. An older Server without
the endpoint causes an explicit failure, not a local fallback. Older Agents
cannot display synchronized pins and may retain historical local locks, but the
updated Server still protects its overrides from their inventory uploads. No
product or protocol-version bump is implied. Read responses add optional
`metadata_overrides`; Server full rows also expose DNS/DHCP fields.

Metadata ownership was reviewed at
[source commit 049f9ce](https://github.com/Printmaster-Org/printmaster/commit/049f9cec1e9e89f5938286bbde8298492ca5f795):
storage, authenticated edit/snapshot handlers, heartbeat/upload reconciliation and
modal controls. Go/SQLite/HTTP and browser regressions cover this bounded slice;
PostgreSQL integration was compiled but skipped because Docker was unavailable.
No live-printer verification or whole-protocol audit is claimed.

### Upload worker wake and shutdown

The Agent uploader adds an optional nonblocking wake capability after successful
local storage commits. The existing default five-minute upload schedule and
payload/auth/route contracts are unchanged. Wakes coalesce into a one-slot queue
with a fixed one-second batching window; repeated wake requests do not reset that
window, and a scheduled upload satisfies a pending wake without resetting cadence.

The wake channel is never closed, so late producers remain safe during/after
shutdown. Explicit stop cancels in-flight HTTP/store work and retry waits and
joins worker loops; parent-context cancellation also exits those loops. Explicit
stop is still needed for WebSocket cleanup and status reset. Worker instances are
not restartable after stop; create a new one. Cancellation does not guarantee a
final flush or successful delivery. No queue replay, idempotency or protocol-version
change is introduced. The scanner runtime calls wake after each successful local commit.

Review scope is the uploader implementation and isolated wake/lifecycle regression
tests only, not a whole-protocol audit or new released binary claim.
Paired source revision:
[`e5abae72f29352c10268f9f0d3b43ed8b31a9ea8`](https://github.com/Printmaster-Org/printmaster/commit/e5abae72f29352c10268f9f0d3b43ed8b31a9ea8),
limited to `agent/upload_worker.go`, `agent/upload_worker_wake_test.go` and the
source-local scanner documentation.

### Explicit channel update command

Fleet consistency follow-up: [backend settings/runtime commit 9c5c0b4](https://github.com/Printmaster-Org/printmaster/commit/9c5c0b41ef1e53242cce04f4304116cb97b0d765) and [channel/settings UI commit e8bdb99](https://github.com/Printmaster-Org/printmaster/commit/e8bdb99ab27c9bf9a23d3f00a534977676672003). This review covers section ownership, effective Agent configuration, settings metadata, and related UI controls, not the entire machine protocol.

The Fleet UI displays persistent `features.agent_update_channel` selection under **Agent Updates**, with Stable, Beta, Dev, and Use Agent configuration options at global, tenant, and Agent scope. Global defaults flow through tenant overrides to permitted Agent overrides; **Inherit** removes an override. Its existing Features ownership/enforcement and manifest selection semantics below are unchanged. Channel and scheduling controls share one section; scheduling policy remains global/tenant scoped. Beta selection remains available before the first beta release; an empty channel does not imply a fallback to Stable. This UI regrouping changes no HTTP or machine payloads.

Managed snapshots now apply only the sections named by `managed_sections`. An explicit empty list means all sections are Agent-controlled and remains empty across Agent restart; absent metadata from legacy snapshots retains the four-section default. Logging, web, detected subnet and discovery display preferences remain local. Managed Discovery ranges and toggles are used by manual/periodic scanning instead of stale local settings; managed SNMP settings apply to new queries and spooler changes restart its worker.

The Agent-local `/settings` write remains outside the read-only Agent OpenAPI subset. It rejects managed section writes with JSON HTTP 409 (`error`, `locked_keys`, `reason`), while allowing the two local Discovery display preferences. Invalid setting types, channel values, SNMP enum values, or asset regexes return HTTP 400 before persistence. Reset retains the managed snapshot. The Server's existing `/api/v1/settings/schema` read (requiring `settings.fleet.read`) adds missing SNMP metadata and numeric bounds; it remains outside the reviewed Server OpenAPI subset. These are compatible corrections to section ownership and local editing, not new machine credentials or routes; no protocol-version change is required.

Persistent-channel/legacy-manifest follow-up: [source commit 589e269](https://github.com/Printmaster-Org/printmaster/commit/589e269fb1cd18a48383cd6e757bc32bdab4159b), reviewing `common/settings`, existing settings resolver/storage, `server/main.go::handleAgentUpdateManifest`, Agent manifest client and dynamic channel provider. Earlier one-shot-command review remains separate below; no whole-protocol audit is implied.

Reviewed at [source commit 685f0fe](https://github.com/Printmaster-Org/printmaster/commit/685f0feccd16b02916cb814f6cdea6d91693738c), specifically `server/main.go::handleAgentCommand`, `agent/autoupdate_worker.go::handleServerCommand`, `agent/autoupdate/manager.go::ForceInstallLatestFromChannel`, `server/releases/intake_worker.go` and `server/releases/manager.go`. This additive command review does not expand the read-only OpenAPI subsets or certify every machine operation.

The existing token-authenticated WebSocket command envelope supports `command: install_channel` with `channel: stable|beta|dev` and an optional `reason`. It requests a one-shot forced install; scheduled channel/policy remains unchanged. Updated Agents enforce [application selection policy](#application-selection-and-installation-descriptors-unreleased), including no downgrades and version pins; Force only bypasses maintenance timing. Existing `check_update` and `force_update` stay supported. Older Agents ignore `install_channel`; **Force install Fleet channel** instead uses their existing `force_update` command together with saved Server-side channel resolution. Delivery to stable 0.31.1 this way inherits the legacy updater's weaker Server-trust policy; it is not independently verified bootstrap or an approved secure migration exception. Follow the [owner-controlled migration boundary](/guides/update-migration/). The Server's user-session `POST /api/v1/agents/command/{agentID}` retains Agent-write role/tenant authorization and acknowledges dispatch only. These writes remain outside read-only OpenAPI subsets.

`POST /api/v1/agents/update/manifest` still uses machine credentials. It now requires a middleware-authenticated Agent (`401` otherwise) and matching request `agent_id` (`403` on mismatch), preventing channel resolution against another Agent/tenant. For component `agent`, ordinary requests use the stored `features.agent_update_channel` when Features is managed and the value nonempty; the existing settings resolver applies global/tenant/allowed-Agent precedence. Empty/unmanaged defaults retain the requested channel, with missing channel defaulting stable. Resolution failure returns plain-text `500`, never silently stable. Invalid channels return plain-text `400`. Older payloads omit the new optional `explicit_channel` boolean and therefore follow saved defaults. Updated clients send `explicit_channel: true` only for explicit one-shot installs, bypassing default selection—not machine authentication.

Missing cached manifests keep the existing HTTP `200`/`success:false` response, not a fallback channel. Enable prerelease intake, restart Server and sync before beta/dev; legacy cached metadata/signatures are repaired during sync. This compatible payload addition intentionally changes ordinary selection only when an administrator explicitly saves a managed channel. Existing default-empty installations remain unchanged. No credential/message-envelope migration or protocol-version bump is required. See [channel rollout implementation](/development/auto-update-plan/#manual-release-channel-installation-and-policy-consolidation).

### Update artifact formats

Reviewed at [source commit bb99bbe](https://github.com/Printmaster-Org/printmaster/commit/bb99bbe850ce2921f4e730b1751d92ec1d1bb361), specifically `common/updatepolicy/artifact_format.go`, `server/releases/intake_worker.go`, `server/releases/manager.go`, `server/main.go::handleAgentUpdateManifest`/`handleAgentUpdateDownload`, `server/storage/release_format_migration.go` and `agent/autoupdate/manager.go::fetchManifest`. This is an additive field review, not a whole-protocol audit.

Windows releases publish a raw `.exe` and an `.msi` for the same `windows/amd64` target. Cached artifacts and signed manifests are now identified by component, version, platform, arch **and format**, so the two no longer overwrite each other.

- `POST /api/v1/agents/update/manifest` accepts an optional `format`: `binary` (default when omitted) or `msi`. `deb`, `rpm` and unknown values return plain-text `400`; package repositories deliver OS packages, so release intake no longer downloads them.
- Returned manifests include `format`, and the signed manifest payload includes it too. MSI download URLs add `?format=msi`; binary URLs are unchanged.
- `GET /api/v1/agents/update/download/{component}/{version}/{platform}-{arch}` accepts the same optional `format` query with the same validation. Both endpoints keep Agent bearer-token authentication (`401` otherwise).
- `GET /api/v1/releases/manifests` accepts an optional `format` query for single-manifest lookups (`400` for unknown values) and reports `format` on each manifest.
- Updated Agents installed by MSI request `msi`. All other installs request `binary`. Agents reject a manifest whose `format` differs from the request and report `MANIFEST_ERROR` telemetry. A missing `format` from an older Server is accepted only for binary installs.

### Manifest signature material

Since [source commit 9bd42d2](https://github.com/Printmaster-Org/printmaster/commit/9bd42d2dbd5cfa06853efaae2bc5ceb2def69451), manifest responses also include:

- `signed_payload`: the base64 encoding of the exact JSON bytes the Server signed.
- `signing_key_id`: the ID of the key that signed them.
- `signing_public_key`: that key's base64 ed25519 public key.

The unsigned fields are rebuilt from storage and cannot be re-serialized byte-for-byte, so Agents verify `signature` against `signed_payload`. They then compare `component`, `version`, `platform`, `arch`, `format`, `channel`, `sha256` and `size_bytes` with the signed copy. If the key record is missing, the Server still serves the manifest without `signing_public_key`.

The pre-TUF **development** implementation pins the first key that produces a valid, consistent signature, in `signing_key_pin.json` in the update state directory. If a later valid signature uses a different key, it logs one warning and pins the new key. Tampered or invalid manifests are never pinned. That verification is log-only; it does not establish publisher authority. It must not be attributed to released 0.31.0/0.31.1 Agents: those pinned tags have no signed-payload verification/pinning and rely on the Server-provided hash during installation. Updated Agents instead enforce the independent TUF authorization described above, with no fallback to these fields. Older Servers omit the fields, and older Agents ignore them. No protocol version bump is required.

**Compatibility:** Agents that predate this field omit `format` and keep receiving the binary, as before. Older MSI-installed Agents therefore still cannot update through the fleet updater; reinstall them once with the current MSI. The Server migrates SQLite and Postgres release tables in place on startup. Existing rows become `binary` unless their cached filename identifies another format; reclassified MSI manifests are re-signed. No machine-protocol version bump is required.

### Device observation timestamps

Reviewed at [source commit 090483d](https://github.com/Printmaster-Org/printmaster/commit/090483d79ed57c20019126ac4a6d0df1c245cb3f) for the Agent liveness worker, guarded storage writes, existing device upload and Server batch ingestion. This review is limited to observation freshness, not a new complete machine payload contract.

Updated Agents perform compact serial-confirmed liveness checks independently of optional discovery/metrics schedules. Successful observations advance device `last_seen`, then travel through the existing `/api/v1/devices/batch` upload (default five-minute upload cycle). Failed probes, IP reuse with a different serial, and save/unsave operations do not refresh that timestamp. Heartbeat/upload receipt alone is not printer liveness. No message type, payload field or machine-protocol version is added. Offline/Unknown UI/dashboard classifications are described in [device reachability](/guides/devices/#device-reachability-and-stale-scans); cached SNMP history is retained.

User-session `POST`/`DELETE /api/v1/devices/delete` is **not** a machine-token operation. Its owner-qualified Server transaction can return plain-text `409` when ownership changed; optional Agent proxy deletion occurs earlier and is not part of that transaction. Report-run lists are also user-session operations: they omit `result_data`, while authorized detail/download still retrieves the result body. See [tenant isolation](/guides/tenant-isolation/) for compatibility and read-only contract exclusions; neither behavior introduces a machine message or protocol version.

Review machine request/response structs and handler tests before adding a separate protocol OpenAPI spec. Document WebSocket message types, acknowledgments, errors, reconnect behavior, and compatibility using **AsyncAPI**; an HTTP upgrade alone does not specify the message protocol.

The [public API roadmap](/development/public-api-roadmap/) separates user automation credentials from machine tokens and recommends contract ownership/testing in the program repository. Destructive commands and credential retrieval are deliberately excluded from the read-only integration slice.

### Agent saved-state upload

Updated Agents include `is_saved: true|false`
per device in `/api/v1/devices/batch`. This reflects persisted Agent state, not
discovery source or printer reachability. The Server retains it in inventory
metadata and exposes an optional boolean on full inventory row/list
responses used by device details. Omitted legacy state remains unknown; explicit `false` is retained.
The lightweight inventory index is unchanged. Existing machine authentication,
owner checks and tenant-scoped user reads remain in effect; no route or
protocol-version change is required. See [saved/discovered behavior](/guides/devices/#saved-versus-discovered-state).

Source scope: [5e3d9bf](https://github.com/Printmaster-Org/printmaster/commit/5e3d9bfac9c33cd8dcb6a685769ea5143e2e45d3),
limited to the saved-state field, persistence, wake and details behavior.
This does not claim a new audit of every machine operation.
