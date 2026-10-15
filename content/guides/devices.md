---
title: "Devices: progressive inventory loading"
description: "Search the authorized inventory immediately while visible rows and supplies load progressively."
weight: 35
---

## What loads first

The Server Devices tab first reads the complete **authorized lightweight index**. Identity previews show serial, make/model, network address, location and last-seen information immediately. The latest indexed page count is available without loading supply metrics. Agent names and tenant labels enrich later; slow or failed directory requests do not hold up device rows.

The index is authorized and scoped in backend SQL. The browser does not download every tenant's full device records and then hide unauthorized devices. See [inventory API semantics](/api/inventory/) and [tenant isolation](/guides/tenant-isolation/).

## Scrolling and switching views

### Filtering by status tags

Click a status tag beside **Total** and **Showing** (Healthy, Warning, Error,
Jam, Offline, or Unknown) to show only devices with that status. Click more
tags to include any of those statuses; click a selected tag again to remove it.
Selected tags are highlighted. With no tags selected, all statuses are shown.
**Clear tag filters** clears the status selection without changing search,
Agent, tenant, manufacturer, or consumable filters. The sidebar status buttons
share the same selection. These filters apply in both Cards and Table views.
Tag counts show totals in the authorized inventory, while **Showing** reflects
all active filters. Tags with zero devices remain available to select.

Cards and Table use the existing renderers and controls. Preview DOM pages contain 30 devices. Only rows inside the viewport plus a 200-pixel overscan are requested; scrolling exposes additional preview pages and hydrates their visible rows. **Load more devices** also works as a keyboard-accessible button.

Rows load before beyond-page-count metrics. Supplies and optional snapshot counters display a loading label until their own request completes; stale toner values embedded in inventory `raw_data` are not shown as current supplies. Switching Cards/Table keeps the hydration caches, rather than fetching the whole fleet again.

Once a device's supplies load, scrolling away and back reuses them without
another request, even after visiting more than 300 devices. Loaded rows and
snapshots stay cached for the current authorized inventory. An explicit reload
clears them; background device updates refresh affected entries while retaining
unchanged devices. Previously loaded supplies remain visible until replacement
data arrives, including when scrolling away and back during an Agent upload.
If a background request fails, the last loaded values stay visible alongside
the retry/error notice; they are not a newly confirmed reading. A successful
response with no snapshot clears the old reading.

Focus a row/card and press **Space** to select or **Enter** to open details. Details explicitly fetch that device's row and snapshot. Right-click context menus and table customization remain available.

In Server tables, long copyable values truncate with an ellipsis while the copy
button remains beside the text without overlapping it. Hover over the text to
see the full value; the copy button always copies the complete value, not the
truncated display. Card and detail text retain their existing wrapping.

### Consumable names and replacement identifiers

Supply cards, compact bars, and charts retain device-reported descriptions and
replacement identifiers when available. Saved per-color descriptions take
precedence over generic `toner_*` labels. Generic entries on devices identified
as inkjet (or reporting ink descriptions) use **Black/Cyan/Magenta/Yellow Ink**
and **Waste Ink**, rather than toner wording. Laser/unknown devices retain
toner terminology when there is no ink evidence.

Ink cartridges and maintenance boxes are collected by their reported
description, so Photo/Matte Black, Cyan/Light Cyan, Magenta/Light Magenta, and
separate maintenance boxes do not collapse into four color slots or a single
waste slot. Existing legacy metric field names remain compatible. Matching
description aliases are deduplicated only when their readings agree.

Historical data can only recover descriptions still linked to its readings.
A list of cartridge names alone cannot establish which level belongs to which
cartridge. Previously collapsed levels cannot be reconstructed without new
device data; a generic waste reading is not assigned to one of multiple
maintenance boxes. Part numbers are reported identifiers, not a verified
replacement recommendation. Official product/replacement links are not yet
provided, and the UI does not invent part numbers or links.

When a reported description ends in vendor part numbers (for example Epson
`Cyan Ink Cartridge T44H2, T44P2, T44W2` or HP `... CF410A`), the device
details view shows the clean supply label with the part numbers on a separate
line. Compact cards and toner bars show the label and keep the part numbers
in the tooltip. Only trailing upper-case letter/digit tokens are treated as
part numbers; nothing is looked up or inferred. See
[source commit 26ddb7f](https://github.com/Printmaster-Org/printmaster/commit/26ddb7f97677bf805c62b02f9a439d260e279a87).

Reviewed at [source commit 21609b2](https://github.com/Printmaster-Org/printmaster/commit/21609b272f4b41c4417ad7278108d8dbe5a271e5),
limited to shared supply rendering, SNMP supply parsing, and description
preservation. Validation used an identity/network-redacted SC-P9500 diagnostic
fixture, synthetic supply-table PDUs, Go tests/vet, and desktop/mobile browser
tests; the printer was unavailable for a fresh scan. This is not a live-device
verification or an audit of saved/discovered state transfer.

### Current inventory and printer status

Successful uploads now retain Agent-reported asset/location, description, Web UI,
network fields, consumables, capabilities and vendor metadata on the Server,
including changes to existing records. Progressive supply hydration preserves
inkjet/type badges and supply descriptions while ignoring stale embedded levels.

Regular metrics polls also refresh Printer-MIB alerts and Epson status before
the Agent sends current inventory and latest metrics. Observed resolved Epson
alerts are cleared; missing or failed status polling does not mark a printer
healthy. Sparse polling preserves previously learned capabilities and vendor
facts. Observation/sample timestamps are retained rather than replaced by upload
time. Updates follow the configured metrics polling and upload/wake cadence;
disconnected Agents cannot refresh Server inventory immediately.

Current vendor/status details are inventory metadata. Historical metrics retain
counters and distinct cartridge/maintenance-box levels, not a complete
historical vendor-status series. Older collapsed supply history cannot be repaired
without fresh device readings.

Synchronization and hydration reviewed at [source commit f22f20d](https://github.com/Printmaster-Org/printmaster/commit/f22f20da2c8226376bae6929a8fafa09ee325e6f),
using synthetic Epson status frames, local SQLite/HTTP tests and desktop/mobile
browser tests. A live Epson printer was not queried during this verification.

### Editing and pinning device metadata

Server device-detail edits are **Server-owned pins**. They persist even when
the Agent is offline and cannot be replaced by later inventory uploads or scans.
Blank text values are valid pins. The Server modal labels pinned fields and
offers **Unpin**, which immediately restores the latest retained reported value.
Search, index, rows and details all use the effective pinned values.

On an updated managed Agent, Server-pinned fields have disabled Edit controls.
Editing an unpinned field submits the change to the Server and creates the same
Server-owned pin, not an Agent-local lock. If the Server is unreachable the edit
fails without changing local data or queuing it for later. A concurrent Server
pin causes a conflict; mixed edits are rejected together rather than partly saved.
Scanned updates and Apply All exclude known pins; DNS changes use address arrays.

Pins synchronize on heartbeat cadence and are cached across Agent restart and
offline periods. Refresh an already-open Agent modal to see newly synchronized
controls; stale controls cannot bypass the Server's conflict checks. Explicitly
disconnecting the Agent releases its cached Server pins. Normal connection
failure does not. Standalone editing and existing local locks remain local;
historical locks are not automatically converted into Server pins.

Manual metadata edits and lock changes do not make a printer appear freshly
observed and do not change metrics/status, saved state or visibility. Editing
display/network metadata does not reconfigure the printer itself or bypass its
serial-identity checks. For the complete managed workflow, update both Agent
and Server; an older Server cannot accept the new machine edit requests.
See [metadata synchronization and API boundaries](/api/protocol/#server-owned-device-metadata).

Implemented and regression-tested at
[source commit 049f9ce](https://github.com/Printmaster-Org/printmaster/commit/049f9cec1e9e89f5938286bbde8298492ca5f795);
this is a source revision, not a deployed release.

### Saved versus discovered state

Saved/discovered is an **Agent-local device state**, not the same as being
present in Server inventory and not the `source_type` discovery method.
Updated Agents include an explicit `is_saved` boolean in device uploads,
including `false` for discovered devices. Save/Save All wakes the existing
upload worker after persistence; coalescing and the worker's request/retry
timing still apply. No save operation advances printer `last_seen`.

The Server retains that flag in the uploaded inventory metadata and exposes it
at the top level of full row/list responses used by device details. The lightweight index stays
unchanged. Shared details honor an explicit flag over a stale saved/discovered
caller hint. Older Agent records without the flag have **unknown** saved state;
Server details do not label them discovered or assume they are saved.

Server details use Server deletion with its existing confirmation/options.
They do not offer the Agent-only **Save Device** action or call Agent-local
save/delete endpoints. For a truly discovered device, save it in its owning
Agent UI; an inventory row on the Server does not save it on the Agent.
After updating an Agent, a successful device upload refreshes retained saved
state without a new SNMP scan.

## Global search, filters and sorting

Search and metadata filters operate across the full authorized index, not just the first rendered page. A distant serial, make/model, hostname, asset number or location can therefore match before its full row has loaded. Agent IDs work before names arrive; agent names and tenant labels become searchable after directories resolve. Tenant membership comes from the agent directory, not from the lightweight device index.

Metadata sorts use the index globally, including indexed total pages. Fields available only in full rows or snapshots cannot provide a correct global sort without extra data; those table columns no longer advertise sorting. The supply sort and an explicitly narrowed Consumables filter trigger bounded snapshot checks across the complete authorized index. These checks do **not** fetch whole-fleet device rows.

**Not loaded is not Unknown.** While global supply checks run, the UI reports pending counts and incomplete results. Pending/error devices are not silently classified as unknown. Unknown means a completed snapshot check had no usable numeric supply level (including no available snapshot). Known matches appear progressively; an empty-state claim is withheld while checks are incomplete. Resetting the supply filter cancels queued nonvisible checks; already-running batches may finish.

## Loading, errors and refresh

- Initial loading does not display a false "No devices" result.
- Index errors show a failure message and **Retry device loading**.
- Row/snapshot errors preserve identity previews and show unavailable/pending fields. Retry is explicit, with at most two attempts per key/stage per refresh; there is no automatic retry loop.
- Successful requests omitting a requested device/snapshot are treated as unavailable/missing, not repeatedly fetched.
- Refresh aborts previous-generation requests and clears caches. Late responses cannot repopulate the new inventory. Device-update notifications coalesce an index refresh.

Requests contain at most 30 serials in this UI (the API maximum is 100), with at most two hydration requests in flight. Full row and snapshot caches each retain at most 300 entries; revisiting evicted entries can refetch them. The full lightweight index, per-key stage state and optional supply classification remain in memory until refresh; DOM pages accumulate as the user scrolls. This is progressive loading, **not** a fully virtualized constant-memory list.

The Devices overview uses authorized index device/agent counts and indexed page-count totals. It does not claim connected-agent counts, fleet-global throughput or complete fresh supply totals. Compact summary cards are keyboard-accessible actions: Agents opens agent filtering, Devices clears filters, Total Pages sorts by indexed page count. Cards remain available on mobile.

## Device reachability and stale scans

**Healthy is not a permanent result of discovery.** The Server Devices tab and dashboard classify a printer as **Offline** when its last successful device observation is at least **15 minutes** old, before displaying cached faults such as jams. Missing/invalid/zero timestamps or timestamps more than one minute in the future show **Unknown**. Explicit offline status takes precedence. Cards, Table, status filters and counts include Offline/Unknown. An open Devices tab re-evaluates age every minute without waiting for another device event; refreshing inventory loads new observations.

The Agent independently checks **visible known network printers**, saved and discovered, at startup and on a **one-minute cadence**. This is enabled when **IP Scanning** and **SNMP** are enabled, even when automatic discovery or Metrics Monitoring is disabled. Each round uses five workers, a five-second per-device context deadline and compact SNMP identity GETs (two-second request timeout, one retry), not a full scan/MIB walk. Rounds do not overlap; large inventories of unreachable printers can take longer than a minute to complete.

Only a response matching the stored serial updates `last_seen`. Merely answering TCP/HTTP at a reused IP is not proof that the old printer is alive. Checks use the standard serial OID, a learned serial OID when available, and supported IEEE-1284 identity payloads. SNMPv1 optional-OID errors fall back to individual identity GETs within the same deadline. Printers whose identity cannot be confirmed, wrong SNMP credentials, blocked SNMP or disabled scanning can age offline even if otherwise powered on; Offline means **no recent verified observation**, not proof of a power failure. USB/local/spooler printers keep their existing monitoring path and are not SNMP-probed by this worker.

Failed checks do not advance `last_seen`, erase raw SNMP data, create scan/metrics history, delete records or replace cached fault messages. Successful checks update only the timestamp with serial/IP/newer-observation guards; deleted devices are not resurrected. Saving/unsaving a device no longer counts as seeing it. Detailed metrics collection remains separate: **off by default**, configured to **60 minutes** when enabled. Liveness success does not imply fresh supplies or fault telemetry.

Observations reach the Server through the existing device upload cycle (default **five minutes**, configurable), not an immediate new WebSocket liveness message. Agent disconnection or upload failure also lets Server observations age offline. Server fleet online/offline counters already use a 15-minute last-seen window; reports and alert rules have their own thresholds and are not standardized by this change. Existing older Agents do not gain the new monitor merely by updating the Server; deploy the updated Agent too.

## Deleting devices

Right-click a device and choose **Delete Device**, or select multiple devices and right-click a selected row/card to choose **Delete N Devices**. Both paths use the same in-page confirmation modal, not a native browser confirmation. Cancel makes no deletion requests and preserves selection.

The modal offers two initially unchecked options:

- **Also delete metrics history** requests explicit historical metrics cleanup. Leaving it unchecked does not override the database's existing foreign-key cascade policy; it is not a guarantee that history survives device deletion.
- **Also delete from agent** requests removal from the owning Agent's local database when connected over WebSocket. For a mixed selection it applies to devices with an associated Agent; unowned records are server-only. Offline Agents or failed Agent deletions do not prevent deletion of an existing Server record, and the Server response reports whether Agent removal succeeded. Devices may be rediscovered on the next scan or re-uploaded if they remain on the Agent.

Bulk deletion sends one `POST /api/v1/devices/delete` JSON request per serial, with `agent_id`, `delete_metrics`, and `delete_from_agent`. It continues after individual failures, clears selection, refreshes inventory, and reports deleted/failed counts. This is not an atomic bulk or cross-process operation. Server authorization uses each device's stored owner, not the browser's claimed `agent_id`; unowned Server records require a global administrator.

Server-initiated Agent deletion suppresses the redundant Agent-to-Server deletion notification, avoiding a double-delete race that could incorrectly report `409 Device ownership changed`. A real disappearance/ownership replacement between lookup and the owner-qualified Server delete still returns `409`; refresh inventory before retrying. See [deletion ownership and ordering](/api/machine-ownership/#http-integration-requirement). This write route remains outside the reviewed read-only OpenAPI subset; no HTTP/protocol/product version changes are introduced.

## Compatibility and implementation

The liveness follow-up is reviewed at [source commit 090483d](https://github.com/Printmaster-Org/printmaster/commit/090483d79ed57c20019126ac4a6d0df1c245cb3f): Agent monitor/startup, context-bound SNMP client, pure serial-identity parsing, guarded timestamp storage and save/unsave semantics, Server dashboard classification, and Devices status aging/filtering. Full Agent and Server Go suites passed; focused monitor/deadline tests passed under the race detector. Browser validation passed 66 progressive inventory/context-menu tests across all six configured projects (six mobile context-menu cases intentionally skipped), including Offline aging without events and recovery. JavaScript unit tests passed 47 tests. This is source validation, not a released/deployed build or real-printer field certification.

Deletion marker forwarding and the shared single/bulk delete flow were reviewed at [source commit e52340a](https://github.com/Printmaster-Org/printmaster/commit/e52340a6bc52561d94cdd5ad521f733632d99cfb). Validation passed the full Server Go suite, authenticated WebSocket deletion and ownership-race regressions, 47 JavaScript tests, and 12 desktop context-menu tests across Chromium (two viewport sizes), Firefox and WebKit; six mobile context-menu cases were intentionally skipped. These are source validation results, not a deployed-release claim.

Requires the Server inventory routes introduced by backend [`bdf1f8f`](https://github.com/Printmaster-Org/printmaster/commit/bdf1f8fea22e91d490238d9ab266f2690070c82d): `GET /api/v1/devices/index`, `POST /api/v1/devices/rows`, `POST /api/v1/devices/metrics/query`. The shared Server UI/controller implementation was reviewed at [`11f502c`](https://github.com/Printmaster-Org/printmaster/commit/11f502c). There is no fallback to legacy all-device list loading. Other tabs and Agent-local inventory are outside this frontend slice. See [shared controller reuse](/development/shared-progressive-loading/).