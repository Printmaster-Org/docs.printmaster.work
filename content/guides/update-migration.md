---
title: "Migrating legacy and long-offline Agents"
description: "Unreleased 0.32 migration boundaries, pinned 0.31 wire contracts and six-month trust-history qualification."
---

## Scope and release status

Qualification tests:
[source 4b97064](https://github.com/Printmaster-Org/printmaster/commit/4b970644cde025bd4a20df9b25c2fca1d0c57329).

This describes qualification of the **unreleased hardened 0.32 updater**.
It is not authorization to activate production signing or unattended updates.
Production root provisioning, independent backups and final release approval
remain separate owner gates.

The protocol/trust fixtures qualify compatibility and publisher recovery.
Separate native rehearsals below run released packages and actual services on
disposable hosted systems. Neither layer qualifies every historical installer
or permits production activation. Existing native helper qualification is not
a substitute for legacy-to-new installation rehearsals.

### Native Linux rehearsal (four native cases passed)

Fixture implementation:
[source ca2e171](https://github.com/Printmaster-Org/printmaster/commit/ca2e17165b0e5fe256a07e0b8c500b5914cffb21).
Initial hosted execution:
[run 39813726943](https://github.com/Printmaster-Org/printmaster/actions/runs/39813726943)
(failed in fixture setup: the production package-command allowlist correctly
refused a fixture `chown` command). The fixture uses direct owner-controlled
file ownership setup instead; the production allowlist is unchanged.
[Follow-up run 39814297352](https://github.com/Printmaster-Org/printmaster/actions/runs/39814297352)
passed both Debian baselines. Both RPM baselines reached the candidate version
but failed the fixture's pre-packaging-byte comparison. The corrected fixture
compares installed bytes with the executable independently extracted from the
finished DEB/RPM, retaining both raw-build and packaged-executable digests
because native RPM build-root processing can transform ELF bytes.
The corrected exact-payload implementation is
[source 6058750](https://github.com/Printmaster-Org/printmaster/commit/6058750caa0bf816af4ad1190a96441609b2a4db);
[run 39814950321](https://github.com/Printmaster-Org/printmaster/actions/runs/39814950321)
is the full-matrix retry. **All four native jobs passed**: 0.31.0 and 0.31.1,
each as DEB and RPM. GitHub may retain an in-progress run wrapper after individual
jobs have uploaded evidence; the per-job successful results are the evidence
for this bounded scope, not a full release/CI claim.

The manual **Legacy Linux migration qualification** workflow has four
disposable jobs: released 0.31.0 and 0.31.1 amd64 packages, each as DEB on
Ubuntu systemd and RPM on Fedora 44 systemd. It installs the actual released
asset after checking a source-pinned SHA256, not a current build with an old
version string. The candidate is built from the exact workflow checkout with
a fixture-only `0.32.0` version; no release tag or product VERSION is changed.

This is **owner-controlled native installation**, not a legacy Server-command
update or a production signed bootstrap. The checkout and pinned baseline
digests are the rehearsal authority; no production keys are created. The
workflow is manual-only, refuses local/persistent runners, and is excluded
from ordinary tests/builds. DEB changes only its disposable hosted runner;
RPM uses a dedicated disposable Fedora systemd container.

The fixture checks actual legacy and candidate HTTP versions, installed
executable/process identity, a saved printer in the legacy-created SQLite
database, database integrity, unchanged configuration/Agent ID/machine and join
token bytes, stable service UID/GID, revoked legacy sudo grants, protected new
helpers, and an inactive unprovisioned helper socket. Invalid package input
must leave the legacy installation/data working. A deliberately broken
post-migration service start requires explicit owner configuration repair and
restart of the **same candidate**, not a database downgrade.

Artifact evidence includes baseline/candidate digests, source SHA, test output,
service journal and a result record. Windows raw/MSI, macOS and other
architectures remain outside this Linux fixture.

### Native Windows MSI rehearsal (hosted evidence pending)

Initial implementation:
[source dc21712](https://github.com/Printmaster-Org/printmaster/commit/dc21712041a9000bc886be8d6ecb7bf3fd687be6).
[Run 39818864195](https://github.com/Printmaster-Org/printmaster/actions/runs/39818864195)
stopped before any installation because the intentional-failure fixture lacked
a WiX `SystemFolder` directory reference. The corrected fixture declares it;
both production and failure variants compile/link without local installation.
WiX emits its documented delayed-service configuration warning and the
existing same-version-upgrade ICE61 warning; actual service behavior still
requires hosted evidence.

The manual **Legacy Windows MSI migration qualification** workflow uses actual
released amd64 MSIs from both stable baselines, verified against independently
recorded SHA256 values. It builds the unreleased candidate from the exact
checkout and runs only on disposable GitHub-hosted Windows runners. The
PowerShell entry point and Go fixture both refuse local/persistent execution.
No live MSI/service operations are performed on the development computer.

Every MSI invocation includes `/qn /norestart REBOOT=ReallySuppress`.
Only exact expected exit codes are accepted; a reboot-required result is a
failure, not authorization to reboot. An observation deadline leaves an
installer transaction intact without killing it, retrying or restarting the
machine.

Tagged 0.31 MSIs install a version-named executable directly under
`Program Files\PrintMaster`. The hardened package owns
`Program Files\PrintMaster\Agent\printmaster-agent.exe`. Merely preserving the
old service registration during upgrade would leave a stale executable path.
The candidate therefore uses native MSI `ServiceInstall`/`ServiceControl` for
registration, canonical ImagePath migration, start/stop/removal and rollback,
rather than non-transactional binary custom actions. It retains LocalSystem,
automatic delayed startup and five-second restart-on-failure actions; WiX's
failure-action reset interval is expressed as zero days rather than the direct
service command's previous 30-second reset interval. Direct non-MSI service
installation is unchanged. WiX UtilExtension is now required by MSI compilation.

The fixture seeds a saved printer in the database created by the actual legacy
service, and preserves configuration, Agent ID and disposable machine/join
tokens. A deliberately failing candidate returns MSI 1603 **after
InstallServices**, requiring native rollback to restore the exact legacy
executable, service path/account and retained data. A subsequent normal MSI
must install the exact candidate, start it without manual path/start repair,
retain SQLite integrity and data, and bind one Windows Installer product to
the canonical executable. Restricted-Users write probes check the executable
and retained private files without repairing their ACLs in the fixture.
Finally, uninstall/reinstall of the candidate verifies native service removal
and fresh registration while retaining owner data.

Evidence includes package/executable/source digests, verbose MSI logs,
Windows Installer events, service registration and the fixture result.
This is owner-controlled installation and transaction qualification, **not
legacy Server-command bootstrap or production trust provisioning**.
Until the hosted run passes, native MSI migration remains unqualified.
Raw Windows service installs, macOS and other architectures remain separate.

## Released baselines

The Agent and Server stable tags share these exact source revisions:

| Stable baseline | Source revision |
| --- | --- |
| `agent-v0.31.0` / `server-v0.31.0` | [84ed40c](https://github.com/Printmaster-Org/printmaster/tree/84ed40c6bbed41414c4bf345c7a72e533afad404) |
| `agent-v0.31.1` / `server-v0.31.1` | [fc82919](https://github.com/Printmaster-Org/printmaster/tree/fc829197b991853a78da72cab625b1c821d0d91b) |

Their manifest requests omit `format` and `explicit_channel`. Their responses
have a binary hash, size and optional legacy signature, but no independent
pinned publisher root. They support `check_update`, `force_update` and
`cancel_update`; they do not handle the newer `install_channel` command.
These are observed source contracts, not promises that an arbitrary 0.31
installation remains safe or that it implements later development features.

## Mixed-version behavior

| Combination | Qualified automated boundary |
| --- | --- |
| 0.31-shaped Agent request to current Server | Authenticated manifest discovery and download still select the raw binary, never the MSI. The exact old request omits both new fields. |
| Current Agent without provisioned publisher authority | Scheduled, manual, forced and channel-install checks fail explicitly before any artifact download or pending installation. |
| Current binary Agent to 0.31-shaped Server with no metadata route | Manifest transport works, but independent authorization fails. No fallback to the Server hash or legacy signature. |
| Current MSI Agent to 0.31-shaped Server | Missing format is rejected as an incompatible artifact; it cannot replace an MSI-owned installation with a raw binary. |
| Current binary Agent to upgraded Server still returning legacy-shaped manifests | Discovery works when separate, owner-provisioned publisher metadata authorizes the exact identity/hash/size. Additional legacy signature fields are not required authority. |

The current-Agent tests exercise real HTTP manifest decoding, machine
authentication, the ClientAdapter, Manager and authenticated metadata transport.
They assert the installed fixture binary stays unchanged, no pending install is
created and no artifact download occurs. The positive discovery case uses the
already-running version so it does not execute an installer.

Older unsequenced progress is not proof of a hardened successful installation.
See [update progress and troubleshooting](/guides/updates/).

## Owner-controlled initial migration

An Agent that never had independent publisher authority cannot safely acquire
that authority from a potentially compromised fleet Server. A Server-delivered
binary and matching hash do not solve this bootstrap problem.

1. Inventory the actual Agent version, installation owner/method, service
   identity and configuration/data paths. Preserve configuration, database,
   credentials and existing update evidence in protected backups.
2. Obtain the approved migration installer/build and its initial public root
   through an independent, owner-controlled verification process. Do not take
   bootstrap trust from a manifest, fleet command, Server time or Server UI.
   No production root is provisioned by the current qualification work.
3. Use the platform's existing installation owner: MSI/package-managed installs
   must not be migrated by swapping their raw executable. Helper provisioning,
   protected state and service permissions must follow the approved platform
   runbook. Do not guess an unattended migration command before that native
   path is qualified.
4. Recheck service operation, Agent identity, data/configuration, permissions,
   authenticated Server connectivity and actual running version. Initial
   migration success is an owner observation, not merely dispatch acknowledgement.
5. After independent trust is installed, use normal publisher verification.
   Missing metadata blocks updates; it does not justify a trust reset.

The legacy Fleet `force_update` action still exists for compatibility, but
using it to deliver the initial hardened build inherits the legacy Server-trust
risk. It is **not** the independently verified migration described here and is
not approved as a secure bootstrap exception.

## Returning after six months offline

The fixture authenticates an actual signed publication at a departure time six
calendar months before the current time, persists all four metadata files and
their integrity/time checkpoint, then restarts a normal Client at the real
current time. Its root and all routine metadata have expired while offline.

During the outage, a dual-authorized root-key successor is published and itself
expires; a subsequent root replaces all routine role keys and supplies fresh
timestamp, snapshot and targets metadata. Disposable authorities are used.
Only fixture setup uses the TUF library's historical reference time: production
verification has no clock override and never bypasses expiry.

Qualified cases include:

- Complete retained root history permits the returning Agent to authorize the
  current target and retain the new root and successful-verification time.
- Missing intermediate/final roots, an unrelated intermediate authority and a
  successor missing its new-root signature block authorization.
- An expired final root, timestamp, snapshot or targets, and an unavailable
  timestamp, block authorization without advancing successful-verification time.
- Publisher-side repair followed by retry works without deleting or changing
  the client checkpoint. Expired final-root recovery publishes a **new root
  version**, not different bytes at an already published version; refreshed
  routine metadata advances its versions as well.
- A restarted recovered Client rejects a correctly signed older timestamp and
  preserves its retained checkpoint. An entirely unrefreshed historical
  publication also fails expiry.

For operators: retain **every intervening versioned root**, serve fresh signed
metadata even when there are no new releases, and keep publisher state and
independent recovery pins intact. A six-month returning client is not evidence
that an indefinitely offline client can recover if its root history has been
removed.

If refresh fails, inspect the diagnostic and recover distribution/signing state
under the [signing operations runbook](/development/update-signing-operations/).
For local corruption, use only the
[exact retained-checkpoint repair](/development/update-client-trust/).
Missing/corrupt checkpoint authority, unavailable owner keys or lost root
history require owner recovery; do not delete caches, roll the clock back or
trust a root offered by the fleet Server.
