---
title: "Update publication-record custody"
description: "Unreleased independent recovery authority, protected GitHub records and interrupted-delivery handling."
---

## Status and trust boundary

Implemented at [source 67567b2](https://github.com/Printmaster-Org/printmaster/commit/67567b26ca121e8a18e6bedf28c9183d9774e49a).

**Unreleased; no production publication or signing activation.** This slice
adds independent publication-record custody to the existing
[sealed delivery and pinned recovery tools](/development/update-signing-operations/).
It is not an Agent signature protocol: TUF remains the update authorization
boundary. The embedded production root remains unprovisioned.

The owner-approved repository is
[Printmaster-Org/printmaster-update-state](https://github.com/Printmaster-Org/printmaster-update-state).
It is **public**, containing public-metadata fingerprints and publication state
only. Publication timing, versions and fingerprints become permanently visible.
Never include private keys, credentials, internal paths, private release data or
operational logs. GitHub's blob SHA1 is only a conditional file revision; publisher
and recovery content pins remain SHA256 and TUF signatures.

On 2026-10-19 the owner approved creation and public visibility after GitHub
rejected private-repository branch protection on the organization's Free plan.
The `main` branch enforces protection for administrators, linear history,
restricted pushes (owner only initially), no force-push and no branch deletion.
Actions are disabled in this records-only repository. `state.json` is explicitly
initialized at schema 1/generation 0 with no latest or pending publication.
This is an **unprovisioned authority**, not a successful first publication.

Public visibility does not grant write access. Protection is checked through
GitHub's authenticated API before reads and writes; missing/unreadable/weakened
protection fails closed. The tools require restricted writers but do not attest
each listed writer's identity, token permissions or organization policies.
Administrators can change protection, delete files or supply false state.
An authorized writer can also corrupt state through ordinary commits.

This repository is independent of B2 and the application Server, **not independent
of GitHub or the GitHub-hosted signer**. Preserve owner-held root fingerprints
and latest-safe timestamp/record fingerprints outside GitHub too. Rolling back or
losing both GitHub authority and owner records is not detectable here.
No production token or routine signing keys have been provisioned.

## Conditional advancement and interrupted delivery

`common/updatestate` stores one bounded JSON document containing schema,
generation, previous Git blob revision, latest completed publication and optional
pending publication. Each identity includes root, timestamp and sealed-record
SHA256 pins plus the positive timestamp version.

The optional `update-deliver -state-repository` integration:

1. Captures and authenticates the sealed publication using the supplied trusted
   root and existing expiry/signature/dependency checks.
2. Checks public remote state against the explicitly supplied previous/current
   timestamp pin, as before.
3. Requires the candidate to advance the independently committed identity with
   the matching previous pin and root, or explicitly bootstrap an unprovisioned
   authority. Root changes require a separate owner-reviewed transition; they
   are not silently accepted.
4. Conditionally records the exact candidate as **pending before any B2 writes**.
   It uses GitHub's Contents API with the previously read blob SHA, reads back
   the exact new state and carries that reservation through delivery.
5. Retains and reads back recovery metadata/records, distributes public immutable
   metadata, then commits and verifies the public timestamp.
6. Only then conditionally moves pending to latest and reads back that state.

A different pending candidate, stale reservation, conflicting revision,
rollback, malformed/missing state, unverified read-back, HTTP error or timeout
stops explicitly. There is no automatic state creation, reset, abort,
re-signing, retry or selection of an old backup. Generation and parent revision
keep normal state transitions distinct; they do not prove a complete,
administrator-resistant audit history.

If a write response is lost, reread and explicitly retry **the same sealed
publication with the same pins**. An exact pending or completed identity is
idempotent. If B2 delivery succeeds but authority completion fails, the tool
reports that distinction instead of reporting overall success. Preserve the
sealed bytes and pending state; do not sign a replacement or clear pending.
Expired pending metadata or unrecoverable divergence needs owner review, not
an expiry bypass or automatic abort.

**This is not a distributed bucket lock.** Matching concurrent retries can share
the same pending identity. External serialization of all sign/deliver/recovery
writers remains mandatory. Protected single-writer GitHub workflow wiring,
credential provisioning, pending sealed-byte recovery before new signing,
freshness scheduling and verified alerts remain the next orchestration work.
No workflow was activated, dispatched or depended on during the reported
Actions/Pages degradation.

## Future credentials and commands

Build the tools before supplying credentials. Keep secrets in the executable's
environment using trusted local tooling, never arguments/chat/logs.

- `UPDATE_STATE_TOKEN`: delivery-only, fine-grained token restricted to the
  records repository, **Contents: read/write**, **Administration: read** (needed
  to verify branch protection), plus GitHub's mandatory Metadata read permission.
- `UPDATE_STATE_READ_TOKEN`: inspection/recovery-only, same repository,
  **Contents: read**, **Administration: read**, Metadata read.
- No Administration write, Actions write, secrets access or B2/signing authority
  is needed. Do not use an owner-wide token as the future unattended credential.
  A GitHub App with equivalent restricted installation permissions may replace
  a fine-grained token, but App provisioning is not implemented by these tools.
- A normal application-repository `GITHUB_TOKEN` cannot write another repository.
  A future workflow still needs an explicitly restricted cross-repository
  credential and reviewed single-writer restrictions.

Public file access alone is insufficient: GitHub requires authentication for
the branch-protection inspection. Token issuance/expiry/rotation and successful
restricted-credential rehearsal remain setup gates.

From `common`, add this public option to the existing delivery invocation:

```powershell
# All existing trusted-root, exact-publication, previous-pin/bootstrap, bucket,
# endpoint and external-serialization arguments remain required.
.\update-deliver.exe -state-repository Printmaster-Org/printmaster-update-state
```

The fragment above is **not a complete runnable delivery command**.
Omitting the option preserves the explicit owner-managed-record procedure; it
does not claim automatic custody. Future unattended delivery must require this
integration rather than silently falling back to manual custody.

To read the sole unambiguous completed identity:

```powershell
go build -o .\update-state.exe .\cmd\update-state
.\update-state.exe -repository Printmaster-Org/printmaster-update-state
```

Successful stdout is JSON containing `root_sha256`, `timestamp_sha256`,
`record_sha256` and `timestamp_version`. Empty/bootstrap, pending, corrupt,
unreadable or unprotected authority exits nonzero without a latest identity.
During an incident choose the authority repository from independently recorded
owner configuration, never a Server or B2 response.

`update-restore -state-repository Printmaster-Org/printmaster-update-state` may
replace the two manual fingerprint arguments in the
[existing recovery command](/development/update-signing-operations/#local-recovery-procedure).
The options are mutually exclusive. It selects only completed, non-pending state
and checks its root fingerprint against the independently supplied root before
opening B2 recovery credentials. All existing empty-directory, external
serialization, retention, bounded lookup and authentication checks still apply.
The recovered sealed record must also match the authority's timestamp version.
Stop all writers for the entire recovery; selection is not a lease.

## Qualification and remaining work

Local tests cover pending/completed retries, conditional conflicts, divergent
read-back, missing/corrupt state, malformed ancestry, rollback/root-change
rejection, explicit size limits and credential-safe HTTP failures. Delivery
tests verify pending precedes B2 writes and completion follows verified delivery.
The live read-only check authenticated branch protection and the initial state,
then correctly refused to select a latest publication.

There has been no live automated custody advancement, B2 upload/retained-version
recovery or failure rehearsal. GitHub Actions/Pages degradation does not waive
these tests. Production key ceremony, independent encrypted backups, real root
embedding, protected signing orchestration, live disposable-key qualification
and the other [0.32 release gates](/development/auto-update-plan/#remaining-032-release-gates-security-handoff-reconciliation)
remain open.
