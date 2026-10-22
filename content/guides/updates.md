---
title: "Update progress and troubleshooting"
description: "Unreleased Agent and Fleet progress, bounded confirmation waits, trust failures and upstream cache sync."
---

## Unreleased scope

This describes the hardened 0.32 development implementation, not a released
0.31.x guarantee. Production publisher trust and unattended activation remain
off until the separate owner provisioning and release gates are approved.
No UI action provisions publisher authority, resets trust history or repairs
an operating-system package database.

## Agent installation progress

The Agent **Settings > Agent Updates** panel, Fleet version cells and Agent
detail dialog use the same progress interpretation:

| Display | Meaning |
| --- | --- |
| Command sent | A request is being delivered or was accepted. The Agent has not yet reported the operation. |
| Checking / Preparing | Looking for an applicable, authorized update or preparing the operation. |
| Downloading | Download in progress. A percentage is shown only when reported by the Agent; unknown is not zero. |
| Staging | Preparing downloaded files. This is not installation success. |
| Installing | Applying the update. The UI does not offer cancellation at this stage. |
| Restarting | Service replacement/restart has begun. Disconnection is expected, not success. |
| Awaiting confirmation | The Agent is verifying the replacement, or the observation is stale/otherwise unconfirmed. Read the accompanying explanation. |
| Updated | A run-bound `succeeded` record was received from the updated Agent. Neither command acknowledgement nor reconnection can create this result. |
| Update failed / Rolled back | A terminal failure or rollback was reported. Its full diagnostic stays visible instead of disappearing after a short toast. |
| Skipped / Cancelled / Idle | The reported operation ended without installing a new update. |

Two minutes without a newer progress report changes active progress to an
explicit **outcome unknown** explanation. The original run/phase is retained.
This is an **observation deadline**, not an installer timeout, proof of failure,
permission to retry or a reason to terminate a privileged transaction.
Long-running native operations may legitimately exceed it.

The UI does not animate estimated completion percentages. Staging, installation,
restart and validation have named phases, not a timer-generated percentage.
An active operation cannot display 100% as installation completion.

While an operation is unresolved, installation controls remain blocked; status
refresh remains available. Cancellation is offered only during checking,
preparation or downloading while the observation is current. A cancellation
request itself is not a cancellation result. Terminal results remain available,
and a later ordered run replaces them. Existing update/channel/policy checks
still enforce whether another operation may actually start.

Agent status refreshes every 45 seconds and has a manual **Refresh Status**
action. Fleet reload, Agent detail fetch and SSE reconnection recover the
stored Agent snapshot. Replayed/out-of-order events cannot reopen a terminal
run, renew its observation timer or overwrite a newer run. A late command
response also cannot overwrite progress already received.

Browser requests for update dispatch/status are bounded to 15 seconds. A lost
response is ambiguous: the operation may have been delivered. The UI preserves
that uncertainty rather than displaying installation failure and immediately
offering another installation.

### Failures and owner repair

Read the persistent error before retrying. Trust errors include clock rollback,
expired/replayed metadata and missing/corrupt retained state. Follow the
[client trust diagnostics and exact-checkpoint repair runbook](/development/update-client-trust/).
Do not delete a checkpoint, bypass expiry or substitute Server time.

If a Linux helper or Windows helper reports owner recovery is required,
preserve its protected evidence and inspect service/package state before any
retry. The [hardening plan](/development/auto-update-plan/) records qualified
native recovery boundaries and installed owner-recovery commands. The browser
does not run those commands, kill package-manager locks or claim universal
automatic rollback.

### Older Agents and unknown results

Unsequenced progress remains readable until an Agent has supplied an ordered
snapshot. Older unsequenced `complete`/`succeeded` messages are shown as
**unconfirmed**, not proof of hardened installation validation. Unknown future
phases also remain explicitly unresolved. Once an ordered snapshot exists,
unsequenced messages cannot replace it. The separate 0.31.x/mixed-version
migration gate is still required; this UI behavior is not that qualification.

## Sync from GitHub

**Fleet Settings > Agent Release Cache > Sync from GitHub** refreshes the
Server's artifact cache. It does not install an Agent update.

The explicit sync has a one-hour context deadline, with fetching, processing,
download and complete/error outcomes. Download/cache verification failures
remain errors; acknowledging the POST is not sync completion. Progress carries
a run ID, increasing sequence, timestamps and deadline. Terminal records cannot
be reopened by delayed progress.

The latest manual sync is retained **in the running Server's memory**.
Browser reload and SSE reconnection recover it; active syncs also refresh
status every 15 seconds, with bounded requests. Polling stops after the
advertised operation deadline plus a two-minute observation allowance.
Two minutes without newer progress displays **outcome unknown** without
manufacturing a terminal error. Final errors remain visible for inspection.

This is not durable sync history across a Server process restart. After such a
restart, no retained record means **no known result**, not success. Scheduled
intake remains separate and can cause an explicit manual sync to report that
intake is already busy.

### Server UI status API scope

These are **Server user-session** operations, not Agent machine-token APIs:

- `GET /api/v1/releases/sync`: administrator-only (`releases.write`), matching
  the existing POST permission and administrative SSE audience. Returns HTTP
  `200`, JSON `{"in_progress":false,"progress":null}` when no manual record is
  retained. Otherwise `progress` contains `run_id`, `run_started_at`,
  `sequence`, `updated_at`, `deadline`, `phase`, `message`, download totals/
  counters and optional `error`. `in_progress` describes the background task,
  not installation success. The snapshot has no history/pagination/query inputs.
- `POST /api/v1/releases/sync`: same authentication/permission; no request-body
  fields. HTTP `200` retains the existing `success:true` dispatch acknowledgement
  and now includes the initial `progress` snapshot. HTTP `409` preserves
  `success:false` / `sync already in progress` and includes the current
  snapshot. An uninitialized intake worker returns HTTP `503` text.
- Both require an authenticated Server user session (missing session: HTTP
  `401`; authenticated non-administrator: HTTP `403`). Unsupported methods
  return HTTP `405` text. No tenant-scoped role can use this global
  administrative status read.

The GET addition and POST projection are reviewed/documented here and covered
by runtime authorization/outcome tests. They remain **outside** the existing
seventeen-operation [Server OpenAPI subset](/api/openapi/); its coverage and
contract version are unchanged. No machine-protocol or product version is
bumped by these additive UI fields.
