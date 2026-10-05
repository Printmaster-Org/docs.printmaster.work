---
title: Progressive Server inventory API
description: Tenant-scoped metadata index, bounded row hydration, and lazy owner-matched latest metrics.
weight: 15
---

Reviewed against backend commit [bdf1f8fea22e91d490238d9ab266f2690070c82d](https://github.com/Printmaster-Org/printmaster/commit/bdf1f8fea22e91d490238d9ab266f2690070c82d). Server contract 0.3.0 covers these additions and the revised legacy list within its 17 operations; this source review is not a product release or whole-API audit.

These three Server web-user operations complement the compatible device list. They require a **user session**, through `Authorization: Bearer <session-token>` or `pm_session`, and viewer-or-higher authorization. Agent ingestion tokens are not accepted. Each request rechecks current stored user roles/memberships; an index or list response is not permission for a subsequent query.

## Load metadata first

`GET /api/v1/devices/index` returns a non-null array, including `[]`. It selects lightweight metadata for fleet-wide client search/sort/filter, not full devices or toner. Fields always present:

- `serial`, `agent_id`, `ip`, `manufacturer`, `model`, `hostname`, `location`, `asset_number`.
- `last_seen` (device timestamp), `status_messages` (array, never null).
- `device_type`, `source_type`, `is_usb`, `spooler_status`, `page_count`.

Optional textual metadata is represented as an empty string; booleans and page count are present even when false/zero. Page count is the latest snapshot matching **serial and current owning agent**, selected by timestamp descending then page count descending for ties. No matching metric means zero; the index cannot distinguish an absent measurement from measured zero. Neither `raw_data`, consumables nor toner payloads are selected.

The index includes all caller-visible metadata, so fleet-size response growth remains unbounded. It does not implement server-side search/filter/pagination or a transactional snapshot across subsequent requests.

### Observation freshness

Observation semantics below were reviewed at [source commit 090483d](https://github.com/Printmaster-Org/printmaster/commit/090483d79ed57c20019126ac4a6d0df1c245cb3f), specifically `agent/liveness_worker.go`, `agent/agent/identity.go`, `agent/storage/sqlite.go`, `agent/upload_worker.go`, and Server ingestion/index/dashboard handlers. The contract's original inventory handler/schema provenance remains pinned separately; this follow-up does not re-audit all 17 operations or change contract 0.3.0.

`last_seen` is a stored device-observation timestamp, not the Server's upload-receipt time or the latest metric timestamp. Updated Agents refresh it through bounded, serial-confirmed liveness GETs for visible network printers; failed/mismatched probes and save/unsave operations do not advance it. Existing Agents and local/spooler sources retain their own observation paths. The Server index/row/list shapes and query authorization are unchanged; `status_messages` and `raw_data` remain cached scan data, not freshly probed faults. No new `online` field or Server-side liveness filter is added. The Server UI derives Offline from 15-minute-old observations and Unknown from unusable timestamps; API consumers must apply their own documented freshness policy. See [reachability details and limitations](/guides/devices/#device-reachability-and-stale-scans).

The dashboard's device-summary `status` now includes `offline` and `unknown` rather than defaulting every retained scan to `healthy`; this dashboard operation remains **outside** the reviewed 17-operation OpenAPI subset. No route, credential, product or protocol version changes are made.

## Hydrate rows before lazy metrics

`POST /api/v1/devices/rows` accepts:

```json
{"serials":["SERIAL-001","SERIAL-002"]}
```

Returns a non-null array of full persisted `DeviceWithMetrics` inventory records, including `raw_data`, consumables, network/spooler properties and timestamps, plus latest owner-matched **page count only**. Top-level `toner_levels`, `color_pages`, `mono_pages`, `scan_count`, `last_metrics_at` are not populated. Full `raw_data` remains the original inventory blob and may itself contain metric-like values; this is not raw-blob sanitization. Clients can display row content without waiting for lazy metrics.

Device fields retain existing `omitempty` serialization: zero `page_count` and empty optional inventory fields are absent. Missing owner-matched page measurements use zero internally. Index page count, unlike rows, is always serialized.

## Fetch lazy metrics

`POST /api/v1/devices/metrics/query` accepts the same request and returns a non-null `MetricsSnapshot` array. Only the latest current-owner-matched record is returned per visible device. Missing/unauthorized serials and devices without matching metrics are omitted without disclosing which case occurred.

Fields: `id` (always zero in this projection), `serial`, `agent_id`, metric `timestamp`; optional nonzero `page_count`, `color_pages`, `mono_pages`, `scan_count`, and nonempty `toner_levels`. `fax_pages`/`tier` are not selected. Equal timestamps are ordered by page count, color, mono, scan and toner JSON text descending; identical projected values are equivalent. This is not a historical tenant-ownership ledger.

## Scope, limits and errors

- Nonadmins require tenant memberships; membership-free users receive `403`. Visible rows/counts use SQL predicates on joined `agents.tenant_id`, not stale device/metric tenant hints or per-device owner lookups. Administrators have explicit unrestricted access. Foreign/unassigned/missing agent ownership is excluded from restricted reads. A tenant with no matching devices receives `[]`, never unrestricted data.
- Each POST requires exactly one JSON object containing non-null `serials`. `[]` is valid. Maximum **100 distinct exact serials**, body maximum **65,536 bytes**. Duplicates collapse; identifiers are not trimmed/case-folded. Blank/non-string keys, unknown JSON fields, malformed/trailing JSON, excess distinct keys and oversized bodies return plain-text `400`.
- All successful arrays are ordered by device `last_seen DESC, serial ASC`, not request-key order. This is deterministic for a stable inventory, not snapshot consistency while devices change.
- Unsupported methods return `405`; missing/invalid sessions `401`; role/scope denial `403`; storage failure or unavailable specialized scoped storage `500`. No all-fleet fallback. Queries fail rather than returning partial metrics.
- Latest page reads use a covering owner/time/page index. Lazy metrics use indexed latest-point lookup, not a full-history `MAX` aggregation. Rows, keys and tenant scope are applied in the same SELECT.

## Legacy list compatibility

`GET /api/v1/devices/list` retains its legacy array without nonempty `limit`, or paginated `devices`, `total_count`, `has_more`, `limit`, `offset` envelope with nonempty `limit`. Invalid/nonpositive limits become 50; values above 200 clamp; invalid/negative offset becomes zero. Rows/counts now use tenant SQL and deterministic ordering. Latest toner/counters remain best-effort and owner-bound; enrichment failure does not fail the list. Legacy unrestricted lists still materialize all matching rows, with metric keys internally chunked to 100.

The [Server OpenAPI subset](/api/openapi/) now covers 17 operations, not every Server API. Existing historical metrics/bounds still use serial-based history and have separate identity/row-limit caveats; see [tenant isolation](/guides/tenant-isolation/). Product versions, route namespace and machine protocol are unchanged.