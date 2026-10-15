---
title: Agent↔Server Protocol
description: Machine enrollment, heartbeat, uploads, updates, and WebSocket boundary.
weight: 30
---

Machine endpoints are hosted on the **Server** and consumed by Agents. They are distinct from both the Server's user-session integration API and the Agent's local API. This page is a verified route/authentication overview, **not a complete payload contract** or AsyncAPI specification.

Route overview originally reviewed at `eeb6259f6060c0534798e3d14ac0cd9d289df9a7`. Ownership/auth additions below were reviewed at [committed hardening revision 864fc3e](https://github.com/Printmaster-Org/printmaster/tree/864fc3ee040bbb28f25d779c69512c5b6999d421). Historical links below retain the baseline route/client provenance; the security guides identify the containing hardening revision. Neither source snapshot is a product release claim.

## Route families

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

## Next contract work

### Inventory and status with metrics

Device batches retain the uploaded common inventory fields (including asset
number, location, description, Web UI URL, network fields, consumables and status
messages) and store `raw_data` directly rather than nesting the entire upload
envelope. Uploaded inventory edits also refresh existing rows. Current
capabilities, tray data and complete parsed vendor metadata are retained there.
Record ownership always comes from the authenticated Agent; uploaded per-record
Agent IDs are not trusted, and atomic owner guards remain in force.

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

**Scope of this prerequisite slice:** Exclusive device/metrics owner checks
remain in force. Shared telemetry will permit same-nonempty-tenant reporters;
site-level enforcement is deferred until devices have their own site assignment.
Those changes, canonical multi-source counter aggregation, idempotent storage
and safe agent retirement are not implemented by the receipt change.

Receipt behavior is implemented at
[source commit 6c189d0](https://github.com/Printmaster-Org/printmaster/commit/6c189d08dd296420642ed31c882e772934ea963e).
Focused Agent client/worker tests and authenticated Server batch/ownership
regressions passed. This slice does not change database schemas or claim a new
PostgreSQL integration run, whole-fleet deployment or released binary.

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

The existing token-authenticated WebSocket command envelope supports `command: install_channel` with `channel: stable|beta|dev` and an optional `reason`. It requests a one-shot forced install; scheduled channel/policy remains unchanged. Existing `check_update` and `force_update` stay supported. Older Agents ignore `install_channel`; **Force install Fleet channel** instead uses their existing `force_update` command together with saved Server-side channel resolution, allowing stable 0.31.1 bootstrap. The Server's user-session `POST /api/v1/agents/command/{agentID}` retains Agent-write role/tenant authorization and acknowledges dispatch only. These writes remain outside read-only OpenAPI subsets.

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

Agents pin the first key that produces a valid, consistent signature, in `signing_key_pin.json` in the update state directory. If a later valid signature uses a different key, the Agent logs one warning and pins the new key. Tampered or invalid manifests are never pinned. Verification is log-only: the SHA-256 download check is still the only enforced control. Older Servers omit these fields, and Agents log them as unverifiable. Older Agents ignore the fields. No protocol version bump is required.

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
