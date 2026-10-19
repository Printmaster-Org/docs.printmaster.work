---
title: "Update signing operations"
description: "Unreleased owner procedures for TUF key custody, rotation and publisher-state recovery."
---

## Status and authority

Reviewed implementation:
[owner initialization/guards 0ab8856](https://github.com/Printmaster-Org/printmaster/commit/0ab88567d77178525d23591dc0152526193b1f04)
and [routine replacement/publisher recovery 6596e21](https://github.com/Printmaster-Org/printmaster/commit/6596e21dec763d737b0f2605532519d68bce1529).

**Unreleased; rehearse with disposable keys only.** The embedded Agent root is
still `null`. These local tools do not activate production signing, distribution
or unattended updates. See the [release gates](/development/auto-update-plan/#remaining-032-release-gates-security-handoff-reconciliation).

TUF is the sole publisher-signature implementation. Four distinct Ed25519 keys
use threshold one per role for the initial single-maintainer policy. Root
authority stays offline; routine automation receives only targets, snapshot and
timestamp keys. The application Server receives public output, never signers.
Changing thresholds/custodians requires a separate ceremony/tooling review.

Self-signatures do not prove publisher identity. Confirm public root fingerprints
through independent owner records before embedding or using them for recovery.
The timestamp fingerprints below pin exact backup/publication state; they are
not a second update-signature protocol and are never an Agent trust bypass.

## Storage and failure assumptions

Use a trusted personal machine and encrypted private storage outside checkouts,
public sync folders, application Server volumes and published metadata trees.
Output parents must already exist and be non-shared/trusted; the tools do not
secure ancestors against replacement by other writers. Generate offline once
the tools/dependencies are built. Do not run the ceremony as SYSTEM.

The key tool creates new directories with Unix mode `0700` and files with
`0600`, or Windows protected inheritable DACLs limited to the current user,
SYSTEM and local Administrators. It rejects existing outputs, source-checkout
outputs and linked/reparse ancestors. Windows ACL/file-inheritance and junction
tests run on Windows; Unix mode/symlink tests need Unix execution.

**PEM files are plaintext staging**, not encrypted key containers. Use an
established encrypted filesystem/vault/backup tool. Never paste a PEM, vault
export or password into chat/issues/logs or commit a private key. These tools
do not provide multi-file crash transactions, memory wiping or secure erasure
of SSDs, snapshots or vault history. A failed ceremony may leave protected
partial output: preserve/review it and choose new outputs, never silently reuse
it. A trusted owner account and machine administrators remain in the boundary.
These ACLs do not qualify the separate installed-Agent/staging ACL release gate.

## Owner ceremony rehearsal and eventual provisioning

**Do not generate production keys until explicitly approved.** From the
application's `common` directory, initialize three new children of a trusted
encrypted parent. Choose an explicit expiry; this example chooses three years,
not a built-in default. Schedule root maintenance well before expiry.

```powershell
$ceremony = 'D:\PrintMasterSigning'
$expires = (Get-Date).ToUniversalTime().AddYears(3).ToString('yyyy-MM-ddTHH:mm:ssZ')
go run .\cmd\update-keys init `
  -offline "$ceremony\offline-v1" `
  -routine "$ceremony\routine-v1" `
  -public "$ceremony\public-v1" -expires $expires
```

Outputs: offline `root.pem`; routine `targets.pem`, `snapshot.pem`,
`timestamp.pem`; public `1.root.json`. Only public metadata may be committed or
distributed. Record the printed public root SHA256, version and expiry
independently of GitHub and the application Server.

Create two independently recoverable **encrypted personal** backups, one
off-site, containing offline/routine keys, exact public roots and their
independent fingerprint records. Verify password/access recovery without the
work account. Work-hosted Vaultwarden may be a third copy, never the only second
copy. Restore **each** copy into fresh private directories on protected storage:

```powershell
go run .\cmd\update-keys verify-keys `
  -root "$ceremony\public-v1\1.root.json" `
  -offline 'E:\PrivateRestore\offline-v1' `
  -routine 'E:\PrivateRestore\routine-v1'
```

Check the printed public root fingerprint against the independent record.
This verifies all four restored keys match and are usable, including for
maintenance after root expiry. It does not prove encryption, independent
custody or correct restore permissions. Manage disposable restores using the
encrypted storage's lifecycle; no secure-erase guarantee is made.

After explicit activation approval and remaining release qualification, copy
only the exact public root into `agent/update_publisher_root.json`, confirm its
fingerprint again, commit and rebuild. The release guard:

```powershell
go run .\cmd\update-keys check-root -root ..\agent\update_publisher_root.json
```

requires a self-authorized, unexpired positive-version consistent-snapshot root
with the initial four-distinct-key policy. It does not verify provenance or the
rest of the release gates. Tagged Stable/Beta CI, local release builds and
non-Dev container builds enforce it; direct `go build` is not a guarded release.
Dev builds remain possible with `null` but cannot authorize updates.

## Routine publication and independent recovery records

**Hosting direction agreed:** GitHub Actions will run routine signing and
scheduled freshness jobs; Backblaze B2 will host public metadata and separately
protected recovery storage. The offline root remains outside automation. B2
credentials, bucket layout/retention, independent recovery permissions,
scheduled workflows and failure-alert verification are **not provisioned**.
The local managed transaction below is the tested prerequisite, not a B2 client
or an active signing service. Existing home backups can be additional copies,
not the only authoritative off-site state.

`update-metadata` does not need a root private key. Use an exclusive, protected
publisher workspace, distinct from the key directory and read-only Server mirror.
Retain **all** versioned roots, targets and snapshots and the committed
`timestamp.json`. Back up this entire workspace after every successful local
publication, before distribution. Keep release artifacts and inventory as well;
this metadata tool does not back up or distribute artifacts.

Every successful CLI publication prints the new timestamp SHA256. Record it,
the public root fingerprint/version and publication context in an independent
owner-controlled **latest-publication record**, then back up the matching
workspace. Preserve root fingerprints/history independently too. Stop if this
record or the backup cannot be completed; do not distribute first and hope an
older backup is sufficient. Managed local mode enforces backup/record-before-
distribution inside its configured local directories. Future GitHub/B2
automation must enforce the remote equivalent and independent custody.

Publish immutable versioned metadata first and `timestamp.json` last. Publisher
writes, backup, records, key transitions and distribution must be serialized.
Low-level publishing assumes exclusive ownership. Managed mode provides
cooperating single-host locks and local commit sequencing; protected remote
automation, independently durable storage and verified freshness alerts remain
pending.

For freshness with unchanged keys and intact signed state, omit `-inventory`:

```powershell
$repository = "$ceremony\publisher-state"
go run .\cmd\update-metadata -repository $repository `
  -root "$ceremony\public-v1\1.root.json" -keys "$ceremony\routine-v1"
```

Expired routine metadata can be authenticated and refreshed from intact
publisher state; the current root and newly issued metadata must be unexpired.
Normal publication verifies existing signatures using the current root only:
it never silently falls back to historical role keys.

## Managed local publication transaction

Implemented at [source 108d75a](https://github.com/Printmaster-Org/printmaster/commit/108d75a6c1b8d17809eb3ff1817daa1f437e5032).

Use four **existing, separate, non-nested** directories on reliable local
filesystems: publisher workspace, publication backups, independent records
and a public distribution mirror. Provision appropriate Windows ACLs/Unix
ownership on these directories and all parents first. The tool checks ordinary
non-linked ancestors (including Windows reparse points) but does not provision
or qualify their permissions, encryption, physical independence or retention.
Keys must remain outside these output trees. Only supported public TUF metadata
is copied; backups/records contain no private signing keys.

```powershell
go run .\cmd\update-metadata `
  -repository "$ceremony\publisher-state" `
  -root "$ceremony\public-v1\1.root.json" -keys "$ceremony\routine-v1" `
  -backup 'E:\SigningBackups' -records 'F:\SigningRecords' `
  -mirror 'D:\PublicUpdateMetadata'
```

Supply all three managed flags together. For first initialization, the workspace
must already exist and `-inventory` must specify a JSON target array (an empty
array is allowed for rehearsal). Omit inventory for scheduled-style freshness;
missing prior state is an error rather than an implicit new repository.
The existing recovery/transition flags also work in managed mode.

The operation:

1. Acquires exclusive `.publisher.lock` files in all four directories in a
   fixed order. Conflicting publishers fail promptly; they do not wait forever.
   Every publishing process must use managed mode or honor these same locks.
   Legacy low-level `Publish`/CLI mode is not automatically serialized.
2. Checks workspace timestamp against the highest retained publication record
   before signing another version. An older or divergent workspace fails.
   This detects workspace rollback while records survive; loss/rollback of both
   workspace and records still requires independently trusted recovery inputs.
3. Copies retained public state into `.pending-publication` under the workspace
   and signs one new publication there. It writes a protected `record.json`
   containing root/timestamp fingerprints, timestamp version, previous commit
   fingerprint and hashes of every staged metadata file.
4. Revalidates sealed hashes, root history/signatures, dependency bindings and
   final expiry. A restored/modified/expired pending publication is not silently
   trusted. Workspace/mirror timestamps must still match the prior or new
   commit (an empty mirror is allowed).
5. Writes a content-addressed backup under the timestamp SHA256 and a matching
   `<timestamp-sha256>.json` in the record directory. Files are synced and
   read back; existing immutable conflicts fail.
6. Only after those writes succeed, updates workspace and mirror, writing
   immutable versioned files first and replacing each `timestamp.json` last.
   A dependency-copy failure cannot expose a new timestamp. Successful delivery
   removes known pending metadata/record files and releases locks.

The mirror is **local output**, suitable for a read-only serving mount or the
future B2 uploader. This command makes no network calls for distribution,
creates no GitHub schedules and sends no alerts. Backups on two paths using the
same disk/account are not independent disaster/credential recovery copies.
File syncing/read-back is not an atomic multi-location transaction or a promise
of power-loss safety on every filesystem: directory-entry fsync, remote object
semantics, ACL qualification and cross-host locking are not implemented here.

### Interrupted runs and explicit resume

A handled failure releases its own locks but preserves pending state. Once
the staged publication has a complete `record.json`, retry with `-resume` and
the same root and managed directories:

```powershell
go run .\cmd\update-metadata `
  -repository "$ceremony\publisher-state" `
  -root "$ceremony\public-v1\1.root.json" -keys "$ceremony\routine-v1" `
  -backup 'E:\SigningBackups' -records 'F:\SigningRecords' `
  -mirror 'D:\PublicUpdateMetadata' -resume
```

Resume validates the sealed publication again and needs no private signing
keys (`-keys` remains a required location argument but files are not loaded).
It never signs another version. Omit inventory and transition/recovery flags;
the sealed bytes already contain that decision. A distribution failure may have
committed the workspace while the mirror still serves the prior timestamp;
resume completes the same publication after the operator fixes the cause.
Do not overwrite an immutable conflict just to bypass a failure.

Crashes may leave lock files. Stop/confirm all participating processes are gone
before an operator removes **only the identified stale lock files**. Never
automatically break a lock based solely on its age/PID. An interrupted unsealed
preparation, expired pending publication, corrupted record, or interruption
during final pending-file cleanup fails closed and requires explicit operator
review against protected backups/records. There is no automatic deletion/reset
of that state and no claim of unattended recovery from every interruption.
Keep public serving pointed at the last complete publication.

## Routine-key loss or replacement

If any routine key is unavailable or potentially exposed, pause signing and
distribution and secure the signing environment. A usable uncompromised
offline root can replace **all three** routine keys without possessing any
previous routine private key. Replacing all three is deliberate: it avoids
retaining partially exposed online credentials.

For example, with root 1 current:

```powershell
go run .\cmd\update-keys rotate-routine `
  -root "$ceremony\public-v1\1.root.json" `
  -old-key "$ceremony\offline-v1\root.pem" `
  -routine "$ceremony\routine-v2" `
  -public "$ceremony\public-v2" -expires $expires

go run .\cmd\update-keys verify-keys `
  -root "$ceremony\public-v2\2.root.json" `
  -offline "$ceremony\offline-v1" -routine "$ceremony\routine-v2"
```

The offline key is unchanged and is not copied into routine output. Back up
and restore-test the new keys/root, record the new root fingerprint and retain
all old public roots. The successor root must be exactly one version newer
and authorized by both previous and replacement root policies. With unchanged
offline authority one root signature satisfies both policies.

The old committed routine metadata is signed by revoked keys, so explicitly
authorize its import **once** with the previous root and the independently
recorded latest timestamp fingerprint:

```powershell
$latestTimestamp = '<64-hex SHA256 from independent latest-publication record>'
go run .\cmd\update-metadata -repository $repository `
  -root "$ceremony\public-v2\2.root.json" -keys "$ceremony\routine-v2" `
  -previous-root "$ceremony\public-v1\1.root.json" `
  -expected-timestamp-sha256 $latestTimestamp
```

This verifies the exact prior timestamp, its signed dependency chain and a
complete internally consistent public root history before producing new
metadata. Existing target identities/hashes are retained, routine versions
increase and orphaned versioned outputs are not overwritten. New metadata is
signed only by the replacement keys. Record/back up the new publication before
distribution. After commit, use ordinary publication with root 2/new keys,
**without** the previous-root option. Repeating an old timestamp pin fails.

An interrupted attempt before the timestamp commit may leave immutable root,
targets or snapshot outputs. With the same independently pinned prior commit,
retry skips orphan routine versions and accepts an exactly matching root
output. A different immutable root at that version fails explicitly. Do not
delete files or reset versions to make it pass.

## Offline root rotation

With a usable previous offline key, create a new key and dual-authorized root:

```powershell
go run .\cmd\update-keys rotate-root `
  -root "$ceremony\public-v1\1.root.json" `
  -old-key "$ceremony\offline-v1\root.pem" `
  -offline "$ceremony\offline-v2" `
  -public "$ceremony\public-v2" -expires $expires
```

This is an alternative transition from root 1, not an instruction to create a
second conflicting root 2 after routine rotation. Always use the actual latest
root/key and fresh directories. Root rotation preserves routine keys. Back up
and restore-test the new root key against the successor public root and
unchanged routine keys. Routine publication may use the new root directly when
the existing routine signatures remain authorized; retain the same publisher
workspace and every intermediate root. Clients pinned to earlier roots need
the complete chain. An expired previous root can authorize its successor;
expired **final** root metadata cannot authorize updates.

## Publisher-state recovery

Stop all writers/distribution. Restore the complete latest publisher workspace
from an authenticated backup into a protected exclusive local directory,
including timestamp, versioned targets/snapshots and the entire root history.
Independently confirm the public root fingerprint/history and retrieve the
**latest** timestamp fingerprint from the separate publication record:

```powershell
go run .\cmd\update-metadata -repository 'E:\PrivateRestore\publisher-state' `
  -root "$ceremony\public-v1\1.root.json" -keys "$ceremony\routine-v1" `
  -expected-timestamp-sha256 $latestTimestamp
```

Adjust paths to the actual current root and matching keys. This authenticates
and refreshes that exact publication without resetting versions or losing
retained targets. A stale/missing timestamp, malformed pin, missing/corrupt
dependency, broken/incomplete root history or unauthorized signer fails.
Routine metadata may be expired; renew an expired root first through its
authorized chain. If keys changed, use the explicit one-step transition above.

The supplied pin must not be computed from the backup or copied from the
application Server as a substitute for the independent record. A valid signed
backup alone does **not** prove it is the latest; choosing an older pin and
backup together can still regress publisher state. If latest state/record is
unavailable, stop: blind version bumps, new empty workspaces and deleting Agent
trust state are not supported recovery. Root-history checks establish internal
consistency, not historical provenance backwards from today's root.

## Compromise and unrecoverable loss

- **Routine compromise:** rotation revokes old keys after clients receive the
  authorized successor root. It cannot undo already installed malicious code,
  eliminate denial of service by a compromised Server or determine whether a
  publication was malicious. Independently review release/target inventory and
  incident timing before re-signing. If the latest commit is suspect, do not
  select an older backup/pin just to continue; incident-specific target
  remediation and potentially poisoned client versions need separate work.
- **Offline key unavailable:** restore and verify an encrypted backup. If all
  authorized root keys are lost, there is no supported in-band replacement;
  independently authenticated out-of-band binary/root recovery is unqualified.
- **Offline root compromised:** routine rotation is not sufficient. Stop
  distribution, assess every authorized release and client, and plan independent
  recovery. Possessing the same compromised root key cannot distinguish the
  owner from the attacker. This tooling is not a complete incident-response
  or already-compromised-client recovery system.
- **Agent trust-state corruption:** this runbook repairs publisher state, not
  client checkpoints. Do not delete Agent metadata/checkpoints to bypass errors.
  Authorized client repair, protected publication/freshness automation,
  production activation and real installation qualification remain release work.
