---
title: Progressive Server inventory API
description: Tenant-scoped metadata index, bounded row hydration, and lazy latest metrics from authorized reporters.
weight: 15
---

These operations are part of Server API contract **0.3.0**, alongside the compatible legacy device list. They use Server user sessions, not Agent upload tokens.

These three Server web-user operations complement the compatible device list. They require a **user session**, through `Authorization: Bearer <session-token>` or `pm_session`, and viewer-or-higher authorization. Agent ingestion tokens are not accepted. Each request rechecks current stored user roles/memberships; an index or list response is not permission for a subsequent query.

## Load metadata first

`GET /api/v1/devices/index` returns a non-null array, including `[]`. It selects lightweight metadata for fleet-wide client search/sort/filter, not full devices or toner. Fields always present:

- `serial`, `agent_id`, `ip`, `manufacturer`, `model`, `hostname`, `location`, `asset_number`.
- `last_seen` (device timestamp), `status_messages` (array, never null).
- `device_type`, `source_type`, `is_usb`, `spooler_status`, `page_count`.

Optional textual metadata is represented as an empty string; booleans and page count are present even when false/zero. Page count is the latest snapshot matching **serial and an eligible reporter**: the management owner, or an Agent in its same nonempty tenant. Selection is timestamp descending, page count descending, then reporting Agent ID ascending for ties. No matching metric means zero; the index cannot distinguish an absent measurement from measured zero. Neither `raw_data`, consumables nor toner payloads are selected. Inventory `agent_id` remains the management owner.

The index includes all caller-visible metadata, so fleet-size response growth remains unbounded. It does not implement server-side search/filter/pagination or a transactional snapshot across subsequent requests.

### Observation freshness

`last_seen` is a stored device-observation timestamp, not the Server's upload-receipt time or the latest metric timestamp. Updated Agents refresh it through bounded, serial-confirmed liveness GETs for visible network printers; failed/mismatched probes and save/unsave operations do not advance it. Existing Agents and local/spooler sources retain their own observation paths. The Server index/row/list shapes and query authorization are unchanged; `status_messages` and `raw_data` remain cached scan data, not freshly probed faults. No new `online` field or Server-side liveness filter is added. The Server UI derives Offline from 15-minute-old observations and Unknown from unusable timestamps; API consumers must apply their own documented freshness policy. See [reachability details and limitations](/guides/devices/#device-reachability-and-stale-scans).

Newer same-tenant secondary device observations may also advance this value
without taking over management inventory; older secondary observations cannot
regress it. Metrics-only uploads do not update inventory `last_seen`.

The dashboard's device-summary `status` now includes `offline` and `unknown` rather than defaulting every retained scan to `healthy`; this dashboard operation remains **outside** the reviewed 17-operation OpenAPI subset. No route, credential, product or protocol version changes are made.

## Hydrate rows before lazy metrics

`POST /api/v1/devices/rows` accepts:

```json
{"serials":["SERIAL-001","SERIAL-002"]}
```

Returns a non-null array of full persisted `DeviceWithMetrics` inventory records, including `raw_data`, consumables, network/spooler properties and timestamps, plus latest eligible-reporter **page count only**. Top-level `toner_levels`, `color_pages`, `mono_pages`, `scan_count`, `last_metrics_at` are not populated. Full `raw_data` remains the original inventory blob and may itself contain metric-like values; this is not raw-blob sanitization. Clients can display row content without waiting for lazy metrics.

Device fields retain existing `omitempty` serialization: zero `page_count` and empty optional inventory fields are absent. Missing eligible-reporter page measurements use zero internally. Index page count, unlike rows, is always serialized.

Full row/list responses used by device details additionally expose optional `is_saved` from
Agent-uploaded inventory metadata: `true` for saved, `false` for discovered,
omitted for older Agents that have not reported state. False is never omitted.
This additive field does not change scope, authorization, ordering or the
lightweight index. Server inventory presence is not proof of Agent-saved state.
No database migration is required; state persists in the existing inventory
JSON blob.

### Effective metadata and Server pins

Full rows can include Server-owned `metadata_overrides`, `dns_servers` and `dhcp_server`.
A present override key is pinned even when its text is blank or its DNS array
is empty. Index, list, rows and details use the same effective values; incoming
uploads do not replace Server pins. Unpin restores the latest retained report.

Inventory `raw_data` retains the Agent's metadata but reserves
`metadata_overrides` for Server-managed pins. Uploaded override maps do not
change the Server's effective values or access permissions. Editing and unpinning
are performed in the Server UI, not through the read-only inventory operations.

## Fetch lazy metrics

`POST /api/v1/devices/metrics/query` accepts the same request and returns a non-null `MetricsSnapshot` array. Only the latest eligible-reporter record is returned per visible device. Missing/unauthorized serials and devices without matching metrics are omitted without disclosing which case occurred.

Fields: `id` (always zero in this projection), `serial`, `agent_id`, metric `timestamp`; optional nonzero `page_count`, `color_pages`, `mono_pages`, `scan_count`, and nonempty `toner_levels`. `fax_pages`/`tier` are not selected. Equal timestamps are ordered deterministically. Metric `agent_id` is the reporting Agent and can differ from inventory `agent_id`. Eligibility follows current tenant assignments; historical tenant ownership is not recorded.

## Scope, limits and errors

- Nonadmins require tenant memberships; membership-free users receive `403`. Restricted responses include only devices in the caller's authorized tenants. Administrators have explicit unrestricted access. Foreign, unassigned, or missing Agent ownership is excluded from restricted reads. A tenant with no matching devices receives `[]`, never unrestricted data.
- Each POST requires exactly one JSON object containing non-null `serials`. `[]` is valid. Maximum **100 distinct exact serials**, body maximum **65,536 bytes**. Duplicates collapse; identifiers are not trimmed/case-folded. Blank/non-string keys, unknown JSON fields, malformed/trailing JSON, excess distinct keys and oversized bodies return plain-text `400`.
- All successful arrays are ordered by device `last_seen DESC, serial ASC`, not request-key order. This is deterministic for a stable inventory, not snapshot consistency while devices change.
- Unsupported methods return `405`; missing/invalid sessions `401`; role/scope denial `403`; storage failure or unavailable specialized scoped storage `500`. No all-fleet fallback. Queries fail rather than returning partial metrics.

## Legacy list compatibility

`GET /api/v1/devices/list` retains its legacy array without nonempty `limit`, or paginated `devices`, `total_count`, `has_more`, `limit`, `offset` envelope with nonempty `limit`. Invalid/nonpositive limits become 50; values above 200 clamp; invalid/negative offset becomes zero. Results use deterministic ordering. Latest toner/counters remain best-effort and eligible-reporter-bound; enrichment failure does not fail the list.

The [Server OpenAPI subset](/api/openapi/) documents 17 operations, not every Server API. Historical metrics and bounds have separate identity and row-limit behavior; see [tenant access](/guides/tenant-isolation/) for the user-visible access scope.