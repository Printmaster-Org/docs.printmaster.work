---
title: "Client update trust diagnostics and repair"
description: "Unreleased offline inspection and exact-checkpoint repair without resetting publisher trust or rollback history."
---

## Scope and safety boundary

This is **unreleased client tooling**, not a production trust ceremony or a
publisher-state recovery command. Production updater activation remains off.
It applies to the shared TUF verifier used by the Agent and the independent
Linux package helper, with separate protected state for each identity.

Normal verification still requires TUF signatures, rotation, expiry, version
checks and an exact authenticated target. Force/retry/channel choices cannot
bypass these checks. The installed Agent keeps running when verification fails;
no installation is authorized and no pending installation is created merely
because trust verification failed.

The approved repair boundary is deliberately narrow:

- Restore only metadata bytes pinned by the **retained local checkpoint**.
- Never replace, regenerate or edit a missing/corrupt checkpoint.
- Never adopt an older backup, accept Server-supplied initial authority, ignore
  expiry, clear version floors or reset successful-verification time.
- Preserve damaged metadata and the checkpoint as repair evidence.
- Stop every verifier writer and maintain exclusive owner control throughout
  inspection, backup and repair. The tool is not a cross-process service lock.

Loss/corruption of the checkpoint, loss of both state locations, full-machine
snapshot rollback, compromised service/administrator identities and root-key
compromise still require separate independently authorized investigation.
The command intentionally provides no reset mode for those cases.

## Diagnostics

Verification errors retain their original Go error chain and carry actionable
messages with local UTC time:

| Diagnostic | Meaning | Owner action |
| --- | --- | --- |
| `trust-state-recovery-required` | Missing/changed metadata, missing/corrupt checkpoint, or checkpoint persistence failure | Preserve both locations. Stop writers, inspect, and use exact-checkpoint repair only if the checkpoint is intact. |
| `trust-clock-rollback` | Local clock is more than five minutes behind the last successful publisher verification | Independently correct time and retry without editing/deleting trust history. |
| `trust-metadata-expired` | TUF rejected expired metadata, or offline inspection found an expired cached role | Check time independently. If correct, obtain publisher refresh or a valid signed root-rotation chain. |
| `trust-metadata-version` | TUF rejected an unexpected metadata version, including replay | Investigate stale/replayed or inconsistent delivery; retain the local version floor. |

A correct local clock and an expired publisher file produce the same expiry
condition as a clock set too far forward. The client cannot establish which
clock is correct from Server time, HTTP `Date`, signatures or expiration alone.
It never changes the machine clock or substitutes Server time.

The sibling schema-1 checkpoint now retains `verified_at`, the greatest local
UTC time recorded after successful exact-target authorization. Failed network,
signature, expiry or target checks do not advance this time; authenticated
metadata/version advances from partial TUF refreshes are still checkpointed.
A small backward correction within five minutes never lowers the time floor.
Larger rollback is rejected before contacting the publisher or rewriting state.

Existing intact schema-1 checkpoints without `verified_at` retain all their
metadata hashes and acquire time history at their next successful authorization.
This cannot detect a bad initial clock before any successful verification.
An older binary may drop the new field when rewriting state; mixed-version
qualification remains a separate release gate. If a successful verification
recorded an incorrectly advanced clock and independent correction now trips the
floor, this repair tool cannot clear it: preserve evidence and escalate.

## Paths, backup and cleanup

For the ordinary Agent, the metadata directory is
`DATADIR/update-trust/metadata`, with sibling checkpoint
`DATADIR/update-trust/metadata.state.json`.
The Linux root package helper uses
`/var/lib/printmaster-update/metadata` and sibling
`/var/lib/printmaster-update/metadata.state.json`.
Confirm the actual installation's data directory before operating.

Keep trusted metadata and its sibling checkpoint out of artifact
download/staging cleanup. Disposable target files are not trust state.
With all writers stopped, retain a protected metadata copy and matching
checkpoint. A copy taken before a newer authenticated refresh may no longer
match the retained checkpoint and must be refused rather than resetting trust.

Use the correct operating-system identity and existing protected directories.
There is no service-user sudo delegation, HTTP endpoint or Agent command for
repair. Root-helper state requires administrative access; ordinary Agent state
must remain owned/protected for its running identity. The offline tool rejects
linked directory ancestors and nonordinary metadata/checkpoint files; it does
not provision or fix OS ownership/ACLs or defend against hostile filesystem races.
Do not run it on shared/writable paths.

## Offline command

From the application's `common` module, build the operator tool:

```sh
go build -o update-client-trust ./cmd/update-client-trust
```

Use `.exe` on Windows. These examples use Unix paths; substitute verified
Windows paths and the installation's actual metadata location as needed.

Stop the relevant Agent and any root-helper instance safely using normal owner
procedures. Do not interrupt an active native installer to perform trust repair;
preserve and reconcile that installation first. Then inspect:

```sh
./update-client-trust inspect --cache /protected/agent-data/update-trust/metadata
```

Inspection is offline and read-only. JSON includes the exact checkpoint digest,
last successful verification time, local UTC, integrity status, and recorded role
versions/expiry. Missing/damaged state, clock rollback and cached expiry return
nonzero with an explicit diagnostic. An intact hash set is **not** online TUF
authorization, proof that the clock is correct, or permission to install.
Inspection never bootstraps absent state.

If the retained checkpoint is intact and a protected metadata copy matches it:

```sh
./update-client-trust repair \
  --cache /protected/agent-data/update-trust/metadata \
  --backup /protected/exact-metadata-copy \
  --externally-serialized
```

`--externally-serialized` is an explicit owner assertion, not automatic service
shutdown or a lock acquired by the tool. The source and destination must be
separate, nonnested locations. Every recorded role must match the checkpoint's
SHA-256 exactly; extra trusted roles, stale bytes, links, malformed records and
missing authority are rejected before any repair writes.

The tool first preserves readable original metadata and the unchanged
checkpoint in a uniquely named sibling `metadata.repair-evidence-*` directory.
It then atomically replaces individual metadata files with the validated bytes.
It never replaces the checkpoint, downloads metadata, invokes a package manager,
restarts a service or installs an update. If repair fails after evidence creation,
its error reports that evidence path. Preserve it.

Rerun inspection, resume the verifier under its normal identity, and request a
normal update check. Successful restoration still requires a fresh online TUF
verification; an expired exact copy does not authorize an offline installation.
An interrupted partial restore can be retried against the same checkpoint and
exact source. Writes are synced per file, not an atomic multi-file transaction
or a directory-fsync power-loss guarantee.

## Validation boundary

Regression coverage includes exact five-minute clock boundaries, persistent
clock history, failure retention, legacy-record migration, expiry of all four
top-level roles, signed refresh/root-rotation recovery without resetting state,
read-only inspection, exact repair with evidence, rejected stale/absent/corrupt
authority, cancellation, and replay rejection after repair.
Manager integration tests check visible trust failures, an unchanged installed
binary, no pending installation, and recovery through a normal check.

These are disposable local fixtures, not a change to the host clock, a production
key exercise, a six-month fleet migration rehearsal or an enrolled
Agent-to-Server installation. Wider migration, UI and final release
qualification remain separate gates.
