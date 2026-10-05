---
title: "Shared progressive inventory controller"
description: "Framework-free demand, cancellation, bounded hydration and viewport observation for reusable inventory UIs."
weight: 45
---

## Shared ownership

`common/web/progressive-loader.js` exports `PrintMasterProgressive` in browsers and CommonJS exports in tests. It has no framework or page-specific dependency. `common/web/shared.go` embeds `ProgressiveLoaderJS`; Server serves it at `/static/progressive-loader.js`, before its application script. The Agent can reuse the controller by adding its own asset route/script and transport adapters; Agent integration is not implemented here.

`createLoader` accepts injected `fetchIndex(context)`, `fetchRows(keys, context)`, `fetchMetrics(keys, context)`, `getKey(item)` and `onChange(event)`. Context contains `signal` and `generation`; adapters should pass the abort signal into transport. Change events contain stage `type`, affected `keys` and generation. Transport failures must reject; successful stages must return arrays, including empty arrays for no authorized matches.

## Lifecycle and demand

1. `load()` resets/aborts prior work, then requests only the index. `getIndexState()` distinguishes idle, loading, ready and error. Empty successful index is ready.
2. Render identity previews from `getIndex()`; apply global metadata filters/sorts before choosing DOM pages.
3. `observeViewport({elements, sentinel, getKey, onDemand, onMore})` owns viewport demand and infinite-page observation. Default overscan is 200 pixels. Pass current DOM rows/cards and optional sentinel. Disconnect the returned observer before changing views/pages. Keep a native Load more button as keyboard/no-observer fallback; without IntersectionObserver the helper demands the first 30 supplied elements.
4. `setDemand(keys)` deduplicates authorized viewport keys and replaces queued row demand. It does not eagerly hydrate the full index.
5. Render completed rows using `getRow(key)`. Only **after hydrated DOM paint**, call `markRendered(keys)` to enable lazy metrics. Server uses animation-frame boundaries and DOM hydration markers. `getMetrics(key)` and `getState(stage, key)` drive pending, ready, missing and error cells.
6. Refresh calls `load()`; `reset()` can abort/clear without another index request. Generation checks ignore stale completion even if an injected adapter ignores its abort signal.

Both stages share a request scheduler: rows take priority over queued metrics. Default batch size is 30 (clamped to 1–100); default concurrency is two (clamped to 1–4). Existing pending/ready keys deduplicate; unsolicited response keys are discarded. Partial responses mark absent keys missing without a fetch loop. Queued offscreen demand is dropped; already-running batches may finish.

`retry(keys)` retries errors explicitly, default maximum two attempts per key/stage (configurable up to three). It does not retry missing results or successfully cached rows. Once exhausted, refresh is required. Index retry is a new `load()`, not an automatic loop.

## Global supply checks

`requestMetrics(keys)` is an explicit exception to viewport metrics demand, used only when a global supply filter/sort requires snapshots. It scans in bounded batches without fetching full rows. `clearMetricQueue()` ends that scan and retains only queued visible metrics. It cannot abort an individual already-running batch; reset aborts the whole generation.

Retain a lightweight per-index-key supply classification separately from the bounded snapshot cache. An evicted snapshot must not erase a completed global classification and silently exclude a distant match. Distinguish pending/error from genuinely unknown/no snapshot. If results are incomplete, say so rather than displaying a definitive empty inventory.

Server metrics adapters consume the exact reviewed snapshot projection: serial, agent ID, timestamp, optional page count/color pages/mono pages/scan count/toner levels (`id` is zero). Snapshot omission is not a zero counter. Zero is a real value. Inventory `raw_data` can include stale toners; the progressive list strips supply and snapshot-counter fallbacks until the queried snapshot is available. Copy/print/fax/duplex counters are not supplied by this projection and remain absent.

## Memory and scope

- Defaults: 300 full rows plus 300 snapshots, separate LRU-like insertion/touch caches; `cacheLimit` cannot be smaller than batch size.
- Full lightweight index, authorized-key set, stage state/attempts, rendered-key set and optional supply bands are O(authorized devices), retained until reset.
- Server preview DOM accumulates 30-row pages while scrolling; not full virtualization. Hydrated values are not copied into the global index array, so cache eviction actually releases the full objects.
- Revisited evicted ready entries can refetch. No TTL/background metrics polling is introduced; refresh starts a new snapshot generation.
- Index metadata supports global search/sort; agent names and tenant memberships enrich from independent directories. Do not pretend MAC/firmware or unqueried counters exist globally in the index.
- Browser caches are not authorization boundaries. Every index, row and metrics request is authenticated/authorized by the Server. Never reuse this Server adapter for Agent-local routes or machine credentials without reviewing those different contracts.

See [reviewed backend contract](/api/inventory/) and [user behavior](/guides/devices/). The Server UI integration and reusable controller were reviewed at source revision [`11f502c`](https://github.com/Printmaster-Org/printmaster/commit/11f502c). This frontend slice changes no OpenAPI schema, HTTP route version, machine protocol or product version.

## Validation

Jest covers delayed/partial/error stages, explicit retry caps, deduplication, reset/stale completion, cache eviction, batch/concurrency limits and shared observation. Playwright serves actual Server HTML/scripts with contract-shaped fixtures, delayed index/rows/metrics/directories, no legacy list requests, bounded first-screen demand, scroll expansion, distant metadata/supply matches, cache-preserving view changes, zero counts, loading/error/empty states and keyboard controls. Run all six configured projects (Chromium desktop/small/mobile, Firefox desktop, WebKit desktop/mobile), including tenancy, table-customizer and context-menu suites. Go static-asset tests verify embed/route/MIME/cache wiring.