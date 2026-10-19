---
title: "Update signing operations"
description: "Unreleased owner procedures for TUF key custody, rotation and publisher-state recovery."
---

## Status and authority

Reviewed implementation:
[owner initialization/guards 0ab8856](https://github.com/Printmaster-Org/printmaster/commit/0ab88567d77178525d23591dc0152526193b1f04)
and [routine replacement/publisher recovery 6596e21](https://github.com/Printmaster-Org/printmaster/commit/6596e21dec763d737b0f2605532519d68bce1529).
Read-only B2 setup checks:
[source 65cd3ab](https://github.com/Printmaster-Org/printmaster/commit/65cd3ab42eee107ffbc856f5f64ca91647831746).
Sealed remote delivery:
[source 19ca5a9](https://github.com/Printmaster-Org/printmaster/commit/19ca5a95413adbaf9cc223b50ce9925c1d26e3cd).
Pinned remote restoration:
[source 0444e42](https://github.com/Printmaster-Org/printmaster/commit/0444e42f038e4ce3c977e856b4569ac5995bdb4c).
Independent publication-record custody:
[source 67567b2](https://github.com/Printmaster-Org/printmaster/commit/67567b26ca121e8a18e6bedf28c9183d9774e49a),
with its [dedicated custody runbook](/development/update-publication-custody/).

**Unreleased; rehearse with disposable keys only.** The embedded Agent root is
still `null`. These local tools do not activate production signing, distribution
or unattended updates. See the [release gates](/development/auto-update-plan/#remaining-032-release-gates-security-handoff-reconciliation).

For the end-to-end serialized workflow, exact pending recovery, freshness
notifications and B2-to-Server pulls, use the
[publisher hosting runbook](/development/update-hosting/)
([source fee8571](https://github.com/Printmaster-Org/printmaster/commit/fee8571297bc24a22da4a579b576a6d7d02ef984)). Its rehearsal
credentials/root are isolated from production and must never be promoted.

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
protected recovery storage. The offline root remains outside automation.
B2 buckets have been owner-created and the authenticated read-only preflight
passed on 2026-10-19. Separate inspection credentials and their GitHub
environment are configured; delivery credentials, independent recovery
permissions, scheduled workflows and failure-alert verification are **not
provisioned**. Local managed transactions and the remote delivery primitive
below are prerequisites, not an active signing service.
Existing home backups can be additional copies,
not the only authoritative off-site state.

### B2 owner setup and read-only preflight

The initial owner-created layout is:

| Setting | Public metadata | Private recovery |
| --- | --- | --- |
| Bucket | `printmaster-update-metadata` | `printmaster-update-recovery` |
| Access | Public | Private |
| Lifecycle | Keep all versions | Keep all versions |
| Object Lock | Disabled | Enabled; default 365 days |
| S3 endpoint | `https://s3.us-west-004.backblazeb2.com` | Same |

The API-verified recovery mode is Governance. These are dedicated B2 Cloud
Storage buckets, not Backblaze Computer Backup.
Never upload private signing keys to either bucket. Encryption at rest does
not make a public object private. Independent encrypted key backups remain
separate from this public-metadata/recovery-state storage.

**Retention-mode correction:** the Backblaze web-console retention dialog only
asks for days; its documented procedure describes resulting files as Compliance
mode. Do not assume the screenshot's "Default 365 Days" means Governance.
Object Lock enablement cannot be undone. A default policy affects future
uploads; changing it does not unlock already retained versions. Do not upload
test files before checking the policy.

The new `common/cmd/update-storage-check` and manual
`.github/workflows/update-storage-preflight.yml` inspect configuration only.
They cannot upload, delete, change settings, sign, reset publisher state or
prove publication/recovery works. The checker requires:

- Exactly one intended bucket per inspection key, with no filename prefix.
- `listBuckets` and `readBucketRetentions`; only an explicit read-only capability
  allowlist is accepted. Account-wide, multi-bucket, write/delete/key-management,
  retention-change and Governance-bypass credentials fail.
- Expected S3 endpoint and exact bucket identity/access.
- Explicitly empty lifecycle rules (keep all versions).
- Readable disabled Object Lock for public metadata; enabled default
  **Governance, 365 days** for recovery.

Requests use the B2 Native API v4, HTTPS Backblaze endpoints, no redirects,
20-second HTTP/one-minute overall bounds and a 1 MiB response limit.
Authorization tokens, credentials, raw service bodies and transport error
strings are not printed. This is a point-in-time configuration check, not
continuous enforcement or an anonymous download/retention behavior test.

#### Owner-only local administration

Use the official [B2 CLI](https://www.backblaze.com/docs/cloud-storage-command-line-tools)
on a trusted owner machine. Authenticate locally using its supported secure
credential mechanism; do not put administrative credentials into GitHub,
chat, shell transcripts or source. Do not regenerate an existing master key
used by home backups. Key creation requires `writeKeys`, which grants broad
account authority: never give that permission to workflow credentials.

After reviewing the intended bucket, the owner can explicitly change the
**future-upload default** using the current CLI:

```powershell
b2 bucket update --default-retention-mode governance `
  --default-retention-period '365 days' printmaster-update-recovery allPrivate
```

This is a mutating owner command, not something the preflight runs. It does
not shorten existing Compliance retention. Do not add lifecycle/deletion
options. Confirm the result using the read-only check before uploading anything.

Create two short-lived inspection keys, one per bucket. The current CLI
supports these exact minimal capabilities (examples expire after seven days):

```powershell
b2 key create --bucket printmaster-update-metadata --duration 604800 `
  printmaster-metadata-check 'listBuckets,readBucketRetentions'
b2 key create --bucket printmaster-update-recovery --duration 604800 `
  printmaster-recovery-check 'listBuckets,readBucketRetentions'
```

**These commands print secret application keys once.** Run privately, without
transcription or shared logs; store the results directly in a password manager
and GitHub environment secrets. Do not send their output to chat/issues.
Avoid guessing web-console Read Only preset capabilities: use the explicit
minimal set, or inspect the resulting permissions and let the checker reject
any extra authority. These are not future publishing credentials.

#### GitHub configuration and activation

In `Printmaster-Org/printmaster`, create environment
`update-storage-preflight`, restrict deployment branches to `main`, and enable
owner approval if the repository's plan supports required reviewers. Do not
assume the environment name alone supplies approval protection.

Add these **environment secrets**, copying values privately from the two
inspection-key results:

| Secret | Value |
| --- | --- |
| `B2_METADATA_CHECK_KEY_ID` | Metadata inspection key ID |
| `B2_METADATA_CHECK_APPLICATION_KEY` | Metadata inspection application key |
| `B2_RECOVERY_CHECK_KEY_ID` | Recovery inspection key ID |
| `B2_RECOVERY_CHECK_APPLICATION_KEY` | Recovery inspection application key |

Add these **environment variables**:

| Variable | Value |
| --- | --- |
| `B2_METADATA_BUCKET` | `printmaster-update-metadata` |
| `B2_RECOVERY_BUCKET` | `printmaster-update-recovery` |
| `B2_S3_ENDPOINT` | `https://s3.us-west-004.backblazeb2.com` |

After the workflow is reviewed and pushed, explicitly set repository variable
`ENABLE_UPDATE_STORAGE_PREFLIGHT=true`. Run **Actions -> Update Storage
Preflight -> Run workflow**, selecting `main`. There is no push, PR or scheduled
trigger. The job skips unless explicitly enabled on `main`; credentials are
exposed only to the prebuilt checker step, not checkout/setup/build. No signing keys belong in
this environment. Expired/missing credentials fail explicitly.

For a local check, supply the same four secrets through a trusted process
environment (not command arguments), then from `common`:

```powershell
go run .\cmd\update-storage-check `
  -metadata-bucket printmaster-update-metadata `
  -recovery-bucket printmaster-update-recovery `
  -s3-endpoint https://s3.us-west-004.backblazeb2.com
```

The first [live API preflight passed](https://github.com/Printmaster-Org/printmaster/actions/runs/39276227518)
on 2026-10-19 at application revision `65cd3ab42eee107ffbc856f5f64ca91647831746`,
including the actual inspection step after owner environment approval. The
owner configured Governance defaults and restricted seven-day inspection keys.
`ENABLE_UPDATE_STORAGE_PREFLIGHT=true` enables manual runs only; no schedule or
production signing was activated. A green preflight is not proof of remote
serialization, immutable recovery read-back, authoritative latest-state recovery,
independent record custody, timestamp-last publication, anonymous serving or
alert delivery. The delivery primitive below has local HTTP-fixture tests,
not a live B2 upload rehearsal. Existing Servers
still serve only their configured local metadata mirror; they do not fetch B2.
Revoke inspection keys when no longer needed.

#### Later account migration

Bucket names/endpoints/credentials are configuration, not Agent trust anchors.
Moving personal B2 storage to an organization account does not itself require
signing-key rotation or rebuilding Agents that obtain metadata through their
Server. Pause publishing, preserve and hash-verify all metadata history and
recovery records, provision/verify destination retention and restricted access,
then switch publication and Server delivery configuration and qualify the
result. Do not assume retention dates/settings transfer during copying.
Previously Compliance-locked versions may remain billable in the old account.
Signing-custody transfer is a separate owner ceremony.

## Remote delivery primitive (unreleased, not activated)

Implemented at [source 19ca5a9](https://github.com/Printmaster-Org/printmaster/commit/19ca5a95413adbaf9cc223b50ce9925c1d26e3cd).

`common/cmd/update-deliver` transfers a sealed backup produced by managed local
publication. It does not sign or load private signing keys. The shared B2 Native
API adapter reuses the preflight HTTP/configuration checks; the inspection CLI
remains read-only and its existing workflow is unchanged.

**Do not run against the production buckets yet.** Delivery credentials and a
protected externally serialized publisher have not been provisioned. The next
rehearsal must use disposable signing keys and isolated test buckets. It must
not seed public production metadata with a disposable trust root.

### Delivery contract and ordering

The caller must exclusively control **all** writers for the whole operation,
including manual tools and other repositories. `-externally-serialized` is an
explicit assertion of that prerequisite, **not a distributed lock**. B2 Object
Lock prevents deletion of retained versions, not creation of a new version at
the same name. Read-before-write and the pre-commit timestamp recheck are not
atomic compare-and-swap. No unattended delivery workflow is added in this slice.

Required inputs are a protected sealed local backup directory, independently
trusted current public root, exact intended timestamp SHA256 and either:

- `-previous-timestamp-sha256`: the independently recorded last **remote**
  publication pin (which can differ from the local signing predecessor); or
- `-bootstrap`: explicit first remote initialization, never a repair/reset for
  missing established state. Bootstrap retries accept the same desired commit,
  but refuse a different existing timestamp.

The tool:

1. Reads the sealed record/metadata once and verifies exact digests, intended
   root identity, complete root history, routine signatures/dependency hashes,
   positive matching versions and expiry against those in-memory bytes.
2. Requires the public timestamp to match the independently pinned previous
   commit or the same desired commit. Established missing state, divergence and
   non-advancing versions fail before any uploads.
3. Uploads the full public metadata history to
   `publications/<timestamp-sha256>/<metadata-name>` in private recovery, then
   its `record.json` and `records/<timestamp-sha256>.json`. Every object must be
   absent or byte-identical; conflicts stop, never overwrite silently.
4. Checks each recovery version's identity/action/length and readable Governance
   retention: still unexpired and covering at least 365 days from its upload.
   Reads the exact uploaded version by B2 file ID and compares all bytes; also
   reads back by the latest-version lookup before allowing public writes.
5. Ensures public versioned metadata first. Rechecks the old remote commit,
   root expiry and sealed routine expiry, then uploads `timestamp.json` last
   and reads it back. A committed timestamp is never replaced by an older
   version. Exact retries do not re-sign or create redundant versions.

Both stores reject hide markers rather than interpret hidden state as a fresh
repository. Errors/ambiguous upload outcomes are explicit; there are no automatic
upload retries, metadata resets, deletes or retention-bypass calls. Preserve the
same sealed directory/root/pins and explicitly rerun after diagnosing failures.
An upload can succeed remotely while its response/read-back fails: retry checks
existing bytes/retention instead of assuming nothing happened.

Requests have 20-second per-request and ten-minute delivery bounds. Control
responses are limited to 1 MiB; individual public-metadata objects to 16 MiB.
Redirects are refused. Upload URLs are limited to authenticated B2-issued HTTPS
endpoints (including documented `pod-*.backblaze.com` upload hosts); tokens,
upload-URL queries and raw service errors are not logged. B2's mandatory SHA1
upload checksum is transport-only; TUF/hash bindings and exact byte comparison
remain the trust/integrity checks. Public uploads request `Cache-Control:
no-store`; anonymous serving/cache behavior still requires live qualification.

### Future delivery credentials

**Do not replace or widen the current inspection keys.** A later controlled
rehearsal needs separate delivery keys, each restricted to its intended bucket
without a filename prefix:

| Purpose | Required capabilities |
| --- | --- |
| Public metadata delivery | `listBuckets,readBucketRetentions,listFiles,readFiles,writeFiles` |
| Private recovery delivery | Above plus `readFileRetentions` |

No `deleteFiles`, key-management, bucket-writing, retention-writing or
`bypassGovernance` permission is accepted. The adapter validates the bucket
visibility/lifecycle/retention configuration again when connecting.

Credentials are supplied only through process environment variables:
`B2_METADATA_DELIVERY_KEY_ID`, `B2_METADATA_DELIVERY_APPLICATION_KEY`,
`B2_RECOVERY_DELIVERY_KEY_ID`, `B2_RECOVERY_DELIVERY_APPLICATION_KEY`.
They are not signing keys and do not belong in the inspection environment.
Build the tool before exposing credentials to its process.

### Remaining remote guarantees

The retained `records/` object and the snapshot's record live in the same B2
bucket; they are **not independently held latest-publication authority**.
The owner/orchestrator must preserve the latest safe remote timestamp **and
sealed-record SHA256** independently. `update-deliver` now prints both after
verified delivery and binds its record output to the sealed bytes it delivered.
The timestamp authorizes the current signed dependency chain; the record
fingerprint also authenticates the inventory of historical/orphan metadata.
Do not derive either pin from the recovery bucket during an incident.

The [explicit restore primitive](#pinned-remote-state-restoration-unreleased)
below can recover exactly pinned retained history, not choose the latest safe
publication or reconstruct an interrupted workspace in place. It cannot detect
loss/rollback of both independent records and all storage state, or make an old
owner-supplied pair of pins current.

The subsequent [publication-record custody slice](/development/update-publication-custody/)
adds a protected separate GitHub record repository, conditional pending/completed
advancement and fail-closed latest selection. It is optional in these explicit
owner tools and is not yet provisioned for unattended delivery.

Protected GitHub orchestration, live retention/read-back/failure rehearsal, scheduled freshness,
verified notifications, artifact publication and B2-to-Server mirroring remain
open. The runtime Server still serves only its configured local public mirror.
Passing local tests does not authorize production signing or close P0-06/P0-07.

Those were open at completion of the remote-delivery primitive. The subsequent
[hosting implementation and qualification](/development/update-hosting/) is the
current authority for workflow, pending recovery, freshness/alerts and mirror
delivery status; production key provisioning/activation remain separate.

## Pinned remote-state restoration (unreleased)

Implemented at [source 0444e42](https://github.com/Printmaster-Org/printmaster/commit/0444e42f038e4ce3c977e856b4569ac5995bdb4c).

`common/cmd/update-restore` restores a sealed public-metadata publication and its
matching local high-water record. It requires the independently trusted current
root, latest-safe timestamp SHA256 and matching sealed-record SHA256. All three
must come from owner records outside the application Server and recovery bucket.
These are recovery pins, not a parallel update-signature scheme or Agent bypass.
The current root must remain unexpired and match the sealed publication; key
transitions still use the separate reviewed owner transition procedure.

**Not activated or live-qualified.** This is explicit operator recovery, not
automatic publisher bootstrap, newest-object selection or a GitHub signing
workflow. It does not upload, sign, reset Agent trust or modify existing local
publisher state.

### Read-only credentials and bounded retained-version lookup

Use a separate recovery-reader application key restricted to the private
recovery bucket, no filename prefix, with:

```text
listBuckets,readBucketRetentions,listFiles,readFiles,readFileRetentions
```

The existing two-capability inspection keys are intentionally insufficient.
Do not widen them or reuse a delivery/master key. Write/delete/key-management,
retention-changing and bypass capabilities are rejected; the recovery reader's
upload method also refuses locally before making a request.

Provide credentials privately through `B2_RECOVERY_RESTORE_KEY_ID` and
`B2_RECOVERY_RESTORE_APPLICATION_KEY`. Build before exposing those values to
the executable. No credentials have been requested or configured for this slice.

Ordinary delivery still rejects hide markers. **Explicit pinned recovery**
may inspect behind hide markers or newer conflicting versions to locate exact
SHA256-matching bytes. The reader downloads by immutable B2 file ID and checks
matching versions' identity, length and still-unexpired Governance retention of
at least 365 days from upload. It never accepts an arbitrary older backup.
Malformed/repeated pagination, missing pinned bytes, filtered/invalid retention
and service errors fail explicitly; no fresh-repository fallback.

Lookup is bounded per object: ten pages of at most ten versions (100 total),
64 MiB downloaded candidate bytes and a one-minute context. Control responses
remain capped at 1 MiB and individual objects at 16 MiB, with 20-second HTTP
timeouts and no redirects. Overall restoration is capped at ten minutes,
4,096 metadata files and 256 MiB of selected record/metadata bytes. Exceeding
these bounds requires owner review, not silent truncation or a weaker lookup.
Heavy version poisoning can deny recovery; retained storage is not availability.

### Local recovery procedure

Stop/serialize all signing, delivery and recovery writers first. Use **two
existing empty, separate, non-nested protected directories** for the recovered
workspace and high-water records. Provision their Windows ACLs/Unix ownership
and every ancestor before running the tool; it checks ordinary/reparse-free
ancestors but does not create or qualify these permissions. Never restore over
existing state, stale locks or partial output. Preserve those for review and
select new empty destinations.

After building from `common`, invoke the resulting executable with public
configuration and fingerprints only (replace the descriptive placeholders):

```powershell
go build -o .\update-restore.exe .\cmd\update-restore
# Supply the two private recovery-reader variables to the executable's
# environment using trusted local tooling, not arguments or shared transcripts.
.\update-restore.exe `
  -repository 'D:\PrivateRecovery\workspace' `
  -records 'E:\PrivateRecovery\records' `
  -root 'D:\PrivateRecovery\trusted-root.json' `
  -timestamp-sha256 '<independently saved latest-safe timestamp SHA256>' `
  -record-sha256 '<independently saved matching sealed-record SHA256>' `
  -recovery-bucket printmaster-update-recovery `
  -s3-endpoint https://s3.us-west-004.backblazeb2.com `
  -externally-serialized
```

This is a future operator procedure, **not a request to create real credentials
or run a production recovery now**. `-externally-serialized` asserts a required
owner-controlled boundary; it does not acquire a remote lock.

The operation acquires local `.publisher.lock` files, verifies both retained
record copies against the independent record pin, validates all filenames/hashes
and bounds before using the inventory, fetches exact pinned metadata, then
checks root history/current identity, TUF signatures/dependency hashes/versions
and the matching timestamp. Only after authentication does it write a durable
`.restore-incomplete` marker, high-water record and read-back-verified workspace
files, with timestamp last among metadata and the sealed record also retained.
Success removes the marker and releases handled-operation locks.

Expired routine metadata is permitted **only for authenticated publisher-state
restoration**. Refresh it with the existing signing tool/current routine keys
before delivery; normal sealed delivery still rejects expired metadata.
The next managed publication continues retained target inventory and versions;
it does not initialize a new repository.

Network/authentication failures leave no restored metadata. Local write failures
can leave partial output with `.restore-incomplete`; crashes can also leave
locks. Both low-level and managed publishing reject incomplete restore state.
Do not remove markers/locks automatically or rerun into partial directories;
preserve evidence and use new empty destinations after authorized review.
There is no in-place restore resume or multi-directory/power-loss transaction.

This proves exact recovery under independently correct/latest owner pins,
protected local filesystem and exclusive-writer assumptions. Automatic
authoritative latest-state selection, independent record storage/advancement,
protected orchestration and a live disposable-key retained-version rehearsal
were not part of that restore primitive. The subsequent
[custody integration](/development/update-publication-custody/) adds conditional
record advancement and completed-state selection, not a distributed writer lock.

## Local publication workspace

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
