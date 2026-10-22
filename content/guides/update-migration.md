---
title: "Migrating legacy and long-offline Agents"
description: "Unreleased 0.32 migration boundaries, pinned 0.31 wire contracts and six-month trust-history qualification."
---

## Scope and release status

This describes qualification of the **unreleased hardened 0.32 updater**.
It is not authorization to activate production signing or unattended updates.
Production root provisioning, independent backups and final release approval
remain separate owner gates.

The automated migration tests qualify protocol compatibility and publisher
trust recovery. They do **not** run a released 0.31 service, replace a live
installation or qualify every historical installer. Native legacy-to-new
installation rehearsals remain required before declaring a supported migration
matrix. Existing native helper qualification is not a substitute for those
rehearsals.

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
