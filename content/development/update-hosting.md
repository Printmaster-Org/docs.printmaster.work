---
title: "Update publisher hosting"
description: "Serialized GitHub publishing, retained pending recovery, freshness alerts and authenticated Server mirroring."
---

## Scope and activation

Implemented at [source fee8571](https://github.com/Printmaster-Org/printmaster/commit/fee8571297bc24a22da4a579b576a6d7d02ef984).

This is the end-to-end hosting implementation for the
[0.32 update work](/development/auto-update-plan/), not production key activation.
TUF remains the sole publisher signature protocol. Production root/key ceremony,
real release inventory authorization and explicit activation remain separate
release gates. The Agent's embedded root is still deliberately `null`.

The workflow is `.github/workflows/update-publisher.yml`; the entry point is
`common/cmd/update-publisher`. It builds/tests before exposing credentials and
runs only on `main`, using separate environments and single-writer concurrency
groups for **rehearsal** and **production**. Neither lane cancels a running
publisher. The environment must allow only `main`; all manual publishing,
delivery and recovery tools must also respect the same exclusive-writer boundary.
GitHub concurrency is not a distributed B2 lock.

Two repository variables gate the lanes independently:

- `ENABLE_UPDATE_PUBLISHER_REHEARSAL=true`: permit isolated manual qualification.
- `ENABLE_UPDATE_PUBLISHER=true`: permit explicitly approved production manual
  operations and scheduled freshness publication every twelve hours
  (`17 */12 * * *`, UTC).

Production is **not enabled**. Rehearsal opt-in is disabled after qualification.
The production environment is prepared with main-only deployment policy and
public configuration only; it contains no credentials or signing keys.
GitHub schedules may be delayed or disabled by GitHub; signed expiry checks and
failure notifications do not provide an independent scheduler/watchdog.
An Actions/Pages outage does not justify trusting stale metadata.

## Publication state machine

Every invocation uses fresh, protected runner work directories.

1. Read protected independent GitHub authority. Missing, malformed or conflicting
   state fails; an explicitly empty authority requires explicit bootstrap.
2. If a publication is **pending**, fetch exactly its already retained sealed
   bytes using the pending timestamp/record/version pins. **Do not load routine
   signing keys or sign another version.** Deliver those bytes and complete
   authority. An expired pending publication requires owner-reviewed recovery,
   not automatic abort, new signatures or an expiry bypass.
3. Otherwise restore the last completed retained publication and its high-water
   state, then create one managed, signed freshness publication. Existing target
   inventory is preserved and versions advance. Bootstrap creates initial public
   metadata; the rehearsal deliberately contains no authorized product release.
4. Verify and retain **all exact sealed payload bytes and both record copies**
   in B2 before reserving independent pending authority. Verify object identity,
   SHA256/read-back and unexpired Governance retention covering 365 days from
   upload. A crash before reservation leaves only an orphaned content-addressed
   backup, not a public version conflict or unrecoverable pending identity.
5. Reserve the exact candidate conditionally in independent GitHub authority.
   Only then write public immutable metadata and its content-addressed public
   sealed inventory, `records/<timestamp-sha256>.json`.
6. Recheck public commit and expiry, commit public timestamp last and verify
   read-back. Only then complete independent authority conditionally.
7. Pull the exact completed publication over public HTTPS into a fresh mirror
   stage, authenticate it and commit the mirror timestamp last. Verify at least
   **48 hours** remain before root/timestamp expiry.

This refines the earlier custody ordering: the durable payload must precede
pending reservation, while pending still precedes **all public writes**.
A network error, ambiguous response or retained-state failure is explicit;
there is no missing-state reset, hidden retry or new signing while pending.
Loss of the HTTP response after timestamp or authority commit is handled by
explicit exact-publication retry, not optimistic success.

The standalone command also accepts `-inventory` with the existing strict
`PublishTarget` JSON array, binding local release bytes to length/SHA256 and
immutable signed target paths. It is forbidden during pending recovery.
The scheduled/manual workflow is freshness-only: it does not silently download
or authorize arbitrary release assets. Production release inventory is supplied
through the reviewed release/key activation procedure.

## Isolated qualification configuration

The owner authorized setup using the locally prompted master B2 authorization;
the master value was never placed in GitHub. It was cleared from CLI cache after
creating scoped keys. Existing production buckets and backup keys were untouched.

| Resource | Rehearsal value |
| --- | --- |
| Public bucket | `printmaster-update-rehearsal-metadata` |
| Recovery bucket | `printmaster-update-rehearsal-recovery` |
| B2 endpoint | `https://s3.us-west-004.backblazeb2.com` |
| Public URL | `https://s3.us-west-004.backblazeb2.com/printmaster-update-rehearsal-metadata` |
| Protected authority | `Printmaster-Org/printmaster-update-rehearsal-state` |
| Environment | `update-publisher-rehearsal` |
| Disposable root SHA256 | `a5bb4b3ac9152e60690f641be7a3803eccc86bbebf6f217cededfe0211e16ed7` |
| Disposable root expiry | `2026-11-18T20:00:00Z` |

Both buckets keep all versions and use B2-managed encryption. Recovery Object
Lock is enabled with Governance/365-day default. Even tiny retained rehearsal
objects remain billable for their retention period; do not delete or weaken
retention to clean up a qualification run.

Environment variables: `B2_METADATA_BUCKET`, `B2_RECOVERY_BUCKET`,
`B2_S3_ENDPOINT`, `UPDATE_STATE_REPOSITORY`, `UPDATE_PUBLIC_URL`.
Environment secrets:

- `UPDATE_ROOT_JSON`: exact public disposable root bytes.
- `UPDATE_TARGETS_PEM`, `UPDATE_SNAPSHOT_PEM`, `UPDATE_TIMESTAMP_PEM`: disposable
  routine keys only. **No root private key in GitHub.**
- `UPDATE_STATE_TOKEN`: owner-created fine-grained, selected rehearsal-state
  repository only, Contents read/write, Administration read, Metadata read.
- `B2_METADATA_DELIVERY_KEY_ID` / `B2_METADATA_DELIVERY_APPLICATION_KEY`.
- `B2_RECOVERY_DELIVERY_KEY_ID` / `B2_RECOVERY_DELIVERY_APPLICATION_KEY`.
- `B2_RECOVERY_RESTORE_KEY_ID` / `B2_RECOVERY_RESTORE_APPLICATION_KEY`.

Three bucket-scoped B2 keys were created for seven days:

| Key | Capabilities |
| --- | --- |
| `pm-rehearsal-metadata-delivery` | `listBuckets,readBucketRetentions,listFiles,readFiles,writeFiles` |
| `pm-rehearsal-recovery-delivery` | Above plus `readFileRetentions` |
| `pm-rehearsal-recovery-reader` | `listBuckets,readBucketRetentions,listFiles,readFiles,readFileRetentions` |

No delete, retention-writing/bypass, bucket administration or key-management
permissions are granted to these keys. Future production uses separately issued
keys and its own protected environment; do not promote the disposable keys/root.
Expiry/rotation and independently recoverable encrypted backups remain explicit
production provisioning work.

## Operations, health and alerts

Manual workflow operations:

- `bootstrap`: only the explicit first generation-zero publication.
- `refresh`: restore completed state and sign freshness, **or recover pending
  exact bytes without signing**.
- `check`: read-only independent authority/public-storage verification and
  authenticated mirror creation with a 48-hour freshness margin.
- `interrupt-bootstrap` / `interrupt-refresh`: rehearsal only, intentionally stop
  before public timestamp write after retaining and reserving the payload.
  The executable also rejects failure injection outside the exact rehearsal
  repository/bucket namespace.

The notification job has issue-write permission, while the publisher job does
not. Failure opens/updates an owner-assigned issue titled
`Update publisher <lane> needs attention`, with the workflow run link and explicit
pending-state recovery guidance. A subsequent fully verified run closes the
issue with a recovery link. GitHub's normal workflow failure notifications and
issue subscription settings remain account-controlled; delivery to email is not
asserted by creating an issue. Notification-job failures are workflow failures,
not swallowed errors.

Only public mirror JSON is uploaded as seven-day run evidence. No work tree,
private key, environment dump or B2 credentials are archived.
Do not enable shell tracing or log credentials.

## B2-to-Server mirror deployment

The Server does not need B2 credentials or signing keys. Provision its exact
trusted public root independently and a separate state-repository read token:
Contents read, Administration read, Metadata read. Only the external scheduled
pull process needs that token; Agents do not receive it.

Build `common/cmd/update-publisher`, provision an existing protected mirror
directory and invoke:

```powershell
.\update-publisher.exe -mode mirror `
  -state-repository Printmaster-Org/printmaster-update-state `
  -public-url 'https://s3.us-west-004.backblazeb2.com/printmaster-update-metadata' `
  -root 'D:\PublisherMirror\trusted-root.json' `
  -mirror 'D:\PublisherMirror\public' `
  -externally-serialized
```

Supply the read-only token through `UPDATE_STATE_TOKEN`; no B2/routine-key
variables are needed in mirror/check mode. Configure this as a single-instance
Windows Scheduled Task or Unix service/timer every hour with an explicit runtime
deadline, restricted identity, failure notification and persistent mirror volume.
Give the Server read-only access to that volume and configure
`RELEASES_PUBLISHER_METADATA_DIR` / `releases.publisher_metadata_dir`.
The trusted root file must stay outside the public mirror.

Mirror requests use bounded, no-redirect HTTPS with no B2/Agent credentials.
Independent completed pins authenticate the record, full historical inventory,
root history and current TUF dependencies/signatures/versions/expiry before
commit. Missing/pending authority, corruption, downgrade, same-version conflict
and stale expiry fail explicitly without replacing the old timestamp.
Immutable files precede timestamp. Protected exclusive local locks are never
auto-broken. Preserve crash evidence for owner review.

The existing machine-authenticated Server metadata route serves these exact
mirror bytes. Integration tests exercise a real publisher-authorized target
through this route and the TUF client, then reject substituted target identity.
The deployment timer and actual customer Server permissions are per-deployment
configuration, not evidence of automatic installation or production activation.

## Qualification evidence

Live isolated workflow qualification is recorded here after execution. Local
tests cover bootstrap, normal refresh, exact pending recovery without key access,
ambiguous timestamp/completion outcomes, missing retained payload, wrong root/
authority, public corruption/missing inventory, rollback/conflict, expiry,
redirection/path validation and the real authenticated Server/TUF boundary.

Production remains gated on its own owner key ceremony, restored encrypted
backups, real root embedding, scoped production credentials and explicit
activation. Independent watchdog, comprehensive power-loss transactions and
health-gated rollback remain deferred, not implied by this hosting pipeline.
