---
title: "Devices: progressive inventory loading"
description: "Search the authorized inventory immediately while visible rows and supplies load progressively."
weight: 35
---

## What loads first

The Server Devices tab first reads the complete **authorized lightweight index**. Identity previews show serial, make/model, network address, location and last-seen information immediately. The latest indexed page count is available without loading supply metrics. Agent names and tenant labels enrich later; slow or failed directory requests do not hold up device rows.

The index is authorized and scoped in backend SQL. The browser does not download every tenant's full device records and then hide unauthorized devices. See [inventory API semantics](/api/inventory/) and [tenant isolation](/guides/tenant-isolation/).

## Scrolling and switching views

Cards and Table use the existing renderers and controls. Preview DOM pages contain 30 devices. Only rows inside the viewport plus a 200-pixel overscan are requested; scrolling exposes additional preview pages and hydrates their visible rows. **Load more devices** also works as a keyboard-accessible button.

Rows load before beyond-page-count metrics. Supplies and optional snapshot counters display a loading label until their own request completes; stale toner values embedded in inventory `raw_data` are not shown as current supplies. Switching Cards/Table keeps the hydration caches, rather than fetching the whole fleet again.

Focus a row/card and press **Space** to select or **Enter** to open details. Details explicitly fetch that device's row and snapshot. Right-click context menus and table customization remain available.

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

## Deleting devices

Right-click a device and choose **Delete Device**, or select multiple devices and right-click a selected row/card to choose **Delete N Devices**. Both paths use the same in-page confirmation modal, not a native browser confirmation. Cancel makes no deletion requests and preserves selection.

The modal offers two initially unchecked options:

- **Also delete metrics history** requests explicit historical metrics cleanup. Leaving it unchecked does not override the database's existing foreign-key cascade policy; it is not a guarantee that history survives device deletion.
- **Also delete from agent** requests removal from the owning Agent's local database when connected over WebSocket. For a mixed selection it applies to devices with an associated Agent; unowned records are server-only. Offline Agents or failed Agent deletions do not prevent deletion of an existing Server record, and the Server response reports whether Agent removal succeeded. Devices may be rediscovered on the next scan or re-uploaded if they remain on the Agent.

Bulk deletion sends one `POST /api/v1/devices/delete` JSON request per serial, with `agent_id`, `delete_metrics`, and `delete_from_agent`. It continues after individual failures, clears selection, refreshes inventory, and reports deleted/failed counts. This is not an atomic bulk or cross-process operation. Server authorization uses each device's stored owner, not the browser's claimed `agent_id`; unowned Server records require a global administrator.

Server-initiated Agent deletion suppresses the redundant Agent-to-Server deletion notification, avoiding a double-delete race that could incorrectly report `409 Device ownership changed`. A real disappearance/ownership replacement between lookup and the owner-qualified Server delete still returns `409`; refresh inventory before retrying. See [deletion ownership and ordering](/api/machine-ownership/#http-integration-requirement). This write route remains outside the reviewed read-only OpenAPI subset; no HTTP/protocol/product version changes are introduced.

## Compatibility and implementation

Deletion marker forwarding and the shared single/bulk delete flow were reviewed at [source commit e52340a](https://github.com/Printmaster-Org/printmaster/commit/e52340a6bc52561d94cdd5ad521f733632d99cfb). Validation passed the full Server Go suite, authenticated WebSocket deletion and ownership-race regressions, 47 JavaScript tests, and 12 desktop context-menu tests across Chromium (two viewport sizes), Firefox and WebKit; six mobile context-menu cases were intentionally skipped. These are source validation results, not a deployed-release claim.

Requires the Server inventory routes introduced by backend [`bdf1f8f`](https://github.com/Printmaster-Org/printmaster/commit/bdf1f8fea22e91d490238d9ab266f2690070c82d): `GET /api/v1/devices/index`, `POST /api/v1/devices/rows`, `POST /api/v1/devices/metrics/query`. The shared Server UI/controller implementation was reviewed at [`11f502c`](https://github.com/Printmaster-Org/printmaster/commit/11f502c). There is no fallback to legacy all-device list loading. Other tabs and Agent-local inventory are outside this frontend slice. See [shared controller reuse](/development/shared-progressive-loading/).