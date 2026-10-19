---
title: "Auto-Update & Installer Repackaging Plan"
source: "docs/dev/AUTO_UPDATE_PLAN.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
legacy: true
---

This document captures the agreed strategy for server- and agent-driven updates, including manifest signing, installer repackaging, and rollout choreography. It serves as a checklist we can iterate through incrementally.

## 0.32 release hardening status

This is a historical plan, not proof that its checked items are enforced.
In particular, older claims below about embedded publisher trust, upstream
checksum verification and mandatory signatures do not describe the current
legacy Server-manifest signature audit. The runtime authorization slice below
replaces that audit as the update decision boundary.

The current release work is tracked in tested implementation slices:

- Implemented: durable ordered Agent/Server progress, retryable terminal outcomes
  and running-version validation across restart.
- Implemented: validated artifact delivery/cache repair and truthful intake errors
  ([source 1765ea9](https://github.com/Printmaster-Org/printmaster/commit/1765ea9f60fcc0011b7d0e018a0c2c4c4bd1c731)).
- Implemented: shared TUF verification, routine metadata publishing and offline
  root initialization/rotation primitives. This is a tested foundation, **not
  a provisioned production signing service**.
- Implemented: fail-closed local TUF metadata integrity checkpoints in the shared
  verifier. See the resumed trust-state slice below; Agent integration and OS
  permission qualification remain pending.
- Implemented: mandatory injected publisher authorization in Agent candidate
  selection and pre-install execution, with explicit unprovisioned-trust and
  unauthenticated-package blocking. Production root/client construction and
  metadata delivery are still pending, so current default builds cannot perform
  unattended updates.
- Required before release: bounded installer/service handoffs, supported 0.31.x
  migration fixtures, TUF publisher metadata and client verification, production
  root provisioning and restricted routine signing/refresh.
- Deferred: independent Agent recovery service, power-loss-safe installation
  transactions, health-gated rollback and a secondary website mirror.

Trust decisions: use an established TUF implementation, not a custom rotation
protocol; one maintainer initially; root private keys stay offline with encrypted
local/off-site recovery copies, never committed or sent through chat. Routine
publishing uses restricted automation. GitHub Actions failure notifications are
the initial alert channel. Six months offline is the initial compatibility test
target, not an intentional cutoff; preserve required versioned root history.
Production secrets, access changes and signing activation require an explicit
owner setup step.

### Remaining 0.32 release gates: security handoff reconciliation

This checklist reconciles the security handoff with application revision
`0d64d3d`, not the contributor fork implementation. These are required outcomes,
not newly completed controls. **P0-06 (independent update trust) remains open.**
**P0-07 (privileged updater hardening) remains open for the relevant update
paths** until platform permissions and the handoff are inspected and tested.
The security handoff is a code-inspection assessment, not an exploit
demonstration.

1. **Enforce independent publisher trust end to end (P0-06).**
   Embed an owner-provisioned public TUF root in release Agents; do not establish
   initial authority from a Server response or its database signing key.
   Wire the shared verifier into every supported automatic, manual, forced,
   channel-switch, retry, cached/resumed and recovery installation path. Server
   policy chooses among publisher-authorized targets; it cannot authorize
   arbitrary bytes. Verify component, platform, architecture, format and the
   intended locally allowed channel, not merely Server-provided labels.
   A forced update may bypass scheduling, not trust, channel restrictions or
   the explicit application-version downgrade policy. TUF metadata rollback
   protection alone does not prohibit selection of an older signed application.
   Deliver publisher metadata unchanged through a bounded Server mirror.
   Missing, invalid, expired or untrusted metadata must stop the update with
   an actionable failure; never fall back to log-only signature checks.

2. **Protect verification through installation (P0-07 update scope).**
   Inspect actual installer-created permissions for raw Windows, MSI and Unix
   installs, including existing installations being migrated. Restrict update
   artifacts, helpers, backups, trust state and their parent directories to
   the service identity and appropriate administrators. Windows requires real
   ACL handling; Go's Unix-style modes are not evidence of that protection.
   Reject unsafe junction/reparse-point/symlink redirection and writable-parent
   substitutions at privileged write boundaries. Bind the handoff to the
   TUF-authenticated expected length/hash in protected state, not replaceable
   manifest or sidecar data. Use a protected handoff and/or verification at
   the privileged boundary that also prevents a verification-to-use race;
   rehashing an attacker-writable path and then reopening it is insufficient.
   Preserve the installed Agent when authorization or final integrity checks
   fail. Test adversarial replacement of staged artifacts and helper inputs.
   There is no confirmed local privilege-escalation claim without establishing
   the applicable ACL/write-access preconditions.

3. **Preserve trust state and enforce clock/rollback behavior.**
   Keep authenticated metadata/high-water state outside ordinary artifact-cache
   pruning. Distinguish first initialization from missing/corrupt previously
   initialized trust state; do not automatically reset trust and accept replay.
   Provide explicit repair guidance using independently trusted inputs.
   Test replay after process restart, artifact cleanup and partial state loss.
   Test incorrect clocks and expiry without bypasses or trusting Server time
   as a replacement time authority; report time/expiry failures clearly while
   leaving the existing Agent running. Protect ordinary cleanup, but do not
   claim resistance to an administrator rolling back the entire machine state.

4. **Authenticate the package actually installed.**
   APT/DNF/YUM currently use a raw-binary manifest for discovery and then install
   separately obtained packages. Bind the actual package bytes to TUF-authorized
   targets and install only those authenticated packages, preserving package
   ownership and dependency-signature checks. Assess package scriptlets,
   dependency sources and repository configuration as part of this boundary.
   Verification of a raw discovery binary is not sufficient. An installation
   path that cannot meet the security gate must be explicitly unsupported for
   unattended update until fixed, not silently use a weaker fallback.

5. **Finish bounded, failure-safe installer handoffs and truthful checks.**
   Complete MSI deadlines and durable helper-result reconciliation. Validate
   backup/staging prerequisites before destructive work; remove unsafe
   copy-over-installed-file fallbacks where interrupted writes can damage the
   installed executable. Verify recovery/startup behavior after failures, and
   bounded package-manager contention/repair behavior without blindly killing
   privileged installation transactions. Retain ordered progress across helper
   outcomes; expose check/download/verification failures rather than reporting
   success on handoff. Make explicit user-initiated upstream checks visibly
   report their bounded progress and final outcome, including reconnect/reload.
   These safeguards must not be described as universal unattended recovery.

6. **Complete signing operations and supported migration.**
   Finish owner tooling/runbooks for initialization, routine-key replacement,
   root rotation, expired metadata, unavailable/compromised signing keys and
   authoritative publisher-state recovery. Preserve versioned root history,
   serialize publishing, schedule freshness refresh without new releases and
   verify failure notifications. Routine signing credentials must not exist on
   the fleet application Server. Document the initial one-maintainer thresholds
   and distinct role keys honestly.
   Test the supported 0.31.x bootstrap and mixed-version matrix, including older
   Servers and six-month-offline Agents. A legacy Agent lacking pinned publisher
   trust cannot retroactively gain it securely from a compromised Server;
   distinguish that initial migration risk from protection after upgrade.
   Any exception must name the affected versions/path, risk, removal condition
   and recovery procedure. No post-migration trust bypass is permitted.
   Production roots, secrets, permissions and activation remain explicit owner
   setup steps.

#### Release evidence required

- [ ] A Server substituting both artifact and matching legacy manifest hash
      cannot get it installed without authorization from pinned publisher trust.
- [ ] Missing/invalid/untrusted/expired metadata and replayed older metadata fail
      explicitly, including after restart; no modern-client legacy fallback.
- [ ] Legitimate root and routine-key rotations work through supported authority
      transitions, including retained-root history and offline recovery cases.
- [ ] Wrong component, OS, architecture, format or disallowed channel is rejected;
      forced/retry/recovery paths cannot bypass application downgrade policy.
- [ ] Corrupt cache and tampered resumed downloads are rejected or safely
      refetched; ordinary cleanup preserves trusted version state.
- [ ] Replacing staging bytes or helper inputs cannot cause unauthenticated bytes
      to be installed, under documented platform permission assumptions.
- [ ] Verification failure leaves the installed Agent unchanged; interruption and
      installer failures preserve a usable installation within the documented
      supported failure model and emit a clear durable failure state.
- [ ] Automatic/manual/channel/force/retry/cache/resume/recovery entry points and
      raw Windows/MSI/Unix/package installation paths have explicit test coverage
      or are clearly blocked as unsupported; real OS/service qualification is
      recorded separately from script-content tests and cross-compilation.
- [ ] Security architecture, protocol and migration documentation state actual
      guarantees and limitations; the completion report lists passing adversarial
      tests and remaining installer, migration and key-operation gaps.

Defer SBOM/provenance, printer/admin origin isolation and Agent credential
hardening to their own workstreams. The independent watchdog, comprehensive
power-loss recovery and health-gated rollback remain architectural follow-ups;
that deferral does not excuse bypassable trust or unsafe pre-install validation.

### Resumed slice: runtime publisher authorization boundary (2026-10-19)

Implemented at [source commit 56e05f4](https://github.com/Printmaster-Org/printmaster/commit/56e05f4f48e82074b870139ec326af48f6c37139).

The Agent manager now requires a `PublisherVerifier` with the shared TUF
client's `Verify(context.Context, updatetrust.Target)` contract. There is no
default allow implementation and no fallback to Server signature auditing.
An unprovisioned verifier returns an explicit publisher authorization error
when a candidate is offered; startup logs warn that updates will be rejected.
The running Agent and post-update version validation still operate.

**Operational change:** the production worker does not yet construct a verifier,
embed a publisher root or provide metadata transport. Consequently this slice's
default builds reject offered update candidates. Do not release these builds
to inaccessible sites expecting another unattended upgrade until provisioning
and metadata delivery are finished. Earlier handoff advice about a
reliability-only dev release predates this fail-closed runtime change.

Candidate selection snapshots the transport's manifest, validates the install
format, rejects mismatched component/OS/architecture/channel, and passes an exact
target to the verifier using the operation's intended identity. The verifier
must authorize its version, size and hash. Scheduled checks, Check now, forced
installation and explicit-channel installation share this boundary. Execution
checks authorization again before cache/download/install work. Verification
errors retain their underlying cause, are classified as manifest errors rather
than Server outages, and public operation failures persist in ordered progress.
Legacy signature fields can neither grant authority nor veto a TUF-authorized
candidate.

APT/DNF/YUM handoff is explicitly blocked even when the discovery binary is
authorized. The former package orchestration path is removed rather than
retained as an alternate bypass. Existing low-level command helpers remain for
subsequent authenticated package delivery work. No repository package is
installed by this blocked path, and no update-pending handoff is created.

Tests use both explicit orchestration stubs and real, disposable signed TUF
repositories. They prove acceptance of an authorized candidate, rejection of a
Server substitution with a matching malicious hash/length, missing/malformed/
expired metadata rejection, no fallback to a valid legacy signature, intended
identity binding, all public entry-point rejection without trust, package
blocking and legitimate retry after rejection. Failed authorization leaves the
installed test Agent unchanged.

This slice does not finish public-root embedding, production verifier wiring,
unchanged Server metadata mirroring, application downgrade policy, package
targets, protected expected-value handoff, staging/privileged boundary integrity
or automatic recovery. Post-restart version checks are not installation
authorization or an independent recovery path. P0-06 and P0-07 remain open.
The next slice must provide independent root/client construction and bounded
metadata delivery without using Server-provided keys as bootstrap authority.

### Resumed slice: persistent trust-state integrity (2026-10-19)

Implemented at [source commit 2693a7d](https://github.com/Printmaster-Org/printmaster/commit/2693a7d3e7fcaaa6d36f4256f9380afadc474990).

This slice completes local metadata loss/corruption detection in the shared TUF
client, a prerequisite for release gate 3. It does not complete that gate's
Agent cleanup integration, operator recovery tooling, clock diagnostics or OS
permission qualification, and does not activate runtime installation enforcement.

The client now maintains a versioned SHA-256 integrity checkpoint for
`root.json`, `timestamp.json`, `snapshot.json` and `targets.json`. For a metadata
directory `C:\agent\publisher-metadata`, its checkpoint is the sibling
`C:\agent\publisher-metadata.state.json`. The metadata directory path is resolved
to an absolute path at client construction; a filesystem root is not allowed.
The checkpoint must be retained alongside protected metadata, never pruned with
downloaded artifacts. Downloaded target files remain disposable.

Before refreshing, the client validates the previously recorded files and their
expected presence. Missing/corrupt metadata, a missing checkpoint for an existing
nonempty metadata directory, unknown checkpoint version or checkpoint mismatch
returns an explicit `ErrTrustState` error before contacting the publisher.
Existing unrecorded metadata is not automatically adopted. Initial use is
allowed only with an absent checkpoint and empty/absent metadata directory;
the checkpoint is written before the independently supplied bootstrap root.
The local integrity record detects loss and corruption, not publisher authority:
standard TUF continues to enforce signatures, versions, rotation and expiry.

An ordinary completed refresh updates the checkpoint even when a later download
or target lookup fails, preserving authenticated root/timestamp advancement and
the library's rollback state. A checkpoint persistence failure fails verification
instead of returning authorization success. A normal network failure can be
retried after restart without deleting trusted state.

Regression tests cover deletion/corruption of each metadata role, missing,
corrupt and unknown-version checkpoints, whole metadata-cache deletion, replay
after restart and disposable target cleanup, timestamp advancement before a
snapshot-fetch failure, retry after initial network failure and failed checkpoint
writes. Existing rotation, newer shipped root and expired local freshness tests
continue to pass. This is not six-month-offline or installer qualification.

**Recovery and limitations:** preserve the metadata and checkpoint as one
consistent trusted set. Do not delete either to get an update through, accept
Server-provided replacement trust, or restore an arbitrarily stale backup that
loses newer version history. On an integrity error, leave the installed Agent
running and escalate for independently authorized state recovery; an operator
repair command/runbook remains release work. A crash between library metadata
persistence and checkpoint replacement can intentionally trigger this error.
Writes use synced temporary files plus rename, not an atomic multi-file
transaction or a directory-fsync power-loss guarantee.

Both paths require protected local storage and exclusive ownership by one
running verifier. Their hashes are not a defense against a principal who can
rewrite both the metadata and checkpoint. Loss of both locations, whole-machine
snapshot rollback, hostile filesystem races, Windows ACL enforcement and
automatic recovery from interrupted checkpoints are not solved by this slice.
Those limitations must be addressed/documented at the runtime and privileged
handoff boundaries rather than represented as independent recovery.

**Next section:** integrate the runtime TUF authorization boundary, public-root
provisioning contract and bounded unchanged metadata delivery; ensure the actual
installed packages and protected expected values are in scope. No production
keys or signing activation were introduced.

### Resume handoff: paused 2026-10-16 (historical snapshot)

The maintainer requested a pause and durable handoff, not another implementation
slice. The proposed ten-minute legacy-test/dev-release-readiness slice was
**not started**. No dev release, push or implementation PR was created.

#### Start here next session

1. Read the application `AGENTS.md` and `.github/copilot-instructions.md`.
   Follow the persisted SOLID/DRY, structured logging, explanatory-comment,
   tested-slice and paired-documentation requirements.
2. Read [issue #51](https://github.com/Printmaster-Org/printmaster/issues/51)
   and its [progress comment](https://github.com/Printmaster-Org/printmaster/issues/51#issuecomment-6223946053),
   then the remaining release gates above. Use the security goals, not the
   contributor fork implementation. Do not introduce a second signing protocol.
3. Check both worktrees and recent history before editing; do not assume these
   local revisions are still the latest. At pause, both were clean on `main`:
   application `0d64d3d3f67653e825349908fdbfb05e9d3ebec1`, documentation
   `d84f8932b36f6547e7051706b1c1d5a2e8f29004` before this handoff addition.
   All implementation/documentation commits from this work remain local.
4. Continue the agreed full pre-0.32 work. Recommended next coherent slice:
   design and implement the runtime authorization boundary around the existing
   TUF verifier, with tests using disposable test keys. Include durable trust
   state ownership/loss detection and the Server metadata-delivery contract.
   Do not activate production signing or ship a test root as production trust.
   Keep package installs explicitly in scope: authenticating a discovery binary
   is not enough. If this spans commits, leave runtime behavior coherent and
   document precisely which paths are still unenforced.
5. Follow with protected privileged handoff/package delivery, installer outcome
   handling, signing operations, migration qualification and the full adversarial
   matrix. Update #51 and canonical docs per slice. Do not close P0-06/P0-07
   from library tests alone.

#### Code map and implementation traps

| Surface | Current state / next integration point |
| --- | --- |
| `common/updatetrust/client.go` | Standard verifier with persistent rotated-root cache and context-bounded refresh. Requires independently supplied root; not used by the Agent runtime. Its `Verify` returns an error, not an immutable authenticated install descriptor. Design protected expected-value ownership when wiring the install boundary. |
| `common/updatetrust/client_test.go`, `root_test.go`, `concurrency_test.go` | Disposable signed repositories, target/expiry/replay/rotation/cache and cancellation tests. Extend these; do not provision real keys for tests. |
| `common/updatetrust/publish.go`, `publish_test.go` | Routine signing; timestamp is the publication commit point; restores signed versioned dependencies, preserves targets and skips orphaned versions. Caller owns serialization. It is not production release automation. |
| `common/updatetrust/root.go` | Offline initialization and root rotation primitives, initially single-root-signature policy. Rotation retains routine role keys; routine-role replacement/recovery tooling remains unfinished. |
| `common/cmd/update-metadata` | Strict inventory CLI, separate routine PKCS#8 keys, freshness-only operation requires previous workspace. No key generation or production activation. |
| `agent/autoupdate_worker.go`, `agent/autoupdate/manager.go` | Construct the manager and inject trust here; `fetchManifest` still calls log-only signature audit. Audit all update entry points rather than assuming this one call closes every bypass. |
| `agent/autoupdate/manager.go` installation methods | Download hash check precedes copying to staging. Raw Windows/MSI helpers use paths/batch scripts; real ACLs and protected expected values are not established. Unix cross-filesystem fallback copies over the installed file. Backup failure currently warns and continues. |
| `agent/autoupdate/command*.go` | Existing deadline/output-cap helper; Linux group termination cannot guarantee control of elevated descendants. Avoid treating forced termination as safe package recovery. |
| `agent/agent/server_client.go` | Strict same-origin bounded artifact downloads and resumed range/length validation, not independent publisher authenticity. Preserve credentials/transport behavior when adding metadata delivery. |
| `server/releases/manager.go`, `intake_worker.go`, `artifact.go` | Cache hashing/repair and bounded serialized intake are implemented. Metadata mirroring must retain publisher bytes unchanged, not re-sign with Server database keys. |
| `server/main.go` update and release-sync handlers | Existing manifest/download/telemetry and sync SSE surfaces. Explicit upstream-check progress/reconnect outcome still needs completion. |
| `.github/workflows/cd-agent.yml` | Existing release automation; no TUF publishing/refresh activation. Package-repository signing must be assessed, not assumed to authenticate TUF-selected installed bytes. |

The verifier currently permits absent root cache as initial bootstrap; the
integration must distinguish initial provisioning from lost previously trusted
state. Its local cache assumes protected filesystem access and a single owning
client. Library persistence is not a promise of directory power-loss durability.
Do not delete trust state to resolve expiry, key rotation or version errors.
Do not use application-Server time or a Server-delivered signing key as a trust
bypass. A Server compromise can still deny updates; independent signing does
not guarantee availability or health of an authorized release.

#### Last validation and operational state

- Passed: all `common` Go tests; Agent `autoupdate` and `agent` package suites;
  Server root and `releases` suites; relevant `go vet`.
- Passed: docs 34 tests, Hugo build and generated-site link checks at the tested
  implementation slices (105 HTML pages, 103 search entries). The subsequent
  security-plan reconciliation passed 34 tests and whitespace checks.
- Linux updater tests were cross-compiled only, not run on Linux. Real Windows
  ACL/MSI/service, Linux package/service and staged-replacement qualification
  remain outstanding. Script-content tests do not establish those guarantees.
- The downloaded checksum-verified Hugo helper and Linux test binary in the
  previous session were removed after use. Hugo may need restoration for a fresh
  site build. Node dependencies were already installed; Docker daemon was
  unavailable. Do not reinstall dependencies unnecessarily.
- No production keys, secrets, hosting/permission changes or signing activation.
  Owner setup is explicit. Initial policy: one maintainer, distinct role keys,
  offline encrypted root recovery copies; backup copies are not threshold
  signers. Work-hosted password storage is optional, never required recovery.
- Six months offline is a compatibility test target, not an expiry bypass or
  intentional support cutoff. Preserve root history and routinely refresh online
  metadata even without new binaries.
- A reliability-only dev release can precede completed TUF enforcement, clearly
  labeled and limited to recoverable test machines. Do not claim publisher trust.
  Test old Agent to first dev build, then first dev build to a subsequent build:
  only the second hop exercises the newly installed updater. Neither push nor
  release was requested or performed at pause.

### Shared TUF foundation (unreleased)

Implemented at [source commit 66b6704](https://github.com/Printmaster-Org/printmaster/commit/66b6704ea7b5f08e2f996b21eeaac8fd9805ae85).
Queued-verification budgets are corrected at
[source commit 0d64d3d](https://github.com/Printmaster-Org/printmaster/commit/0d64d3d3f67653e825349908fdbfb05e9d3ebec1).

`common/updatetrust` uses `theupdateframework/go-tuf/v2` v2.4.2 for standard
signature, expiry, rollback and root-chain verification. A caller supplies an
independently provisioned trusted root, a persistent protected cache and the
metadata source URL. Verification refreshes metadata before authorizing the
exact component/channel/version/platform/architecture/format identity, length
and SHA-256. It has a two-minute context budget (including waits for another
refresh on the same client), caller cancellation and bounded metadata reads.
Each persistent cache must be owned by one running verifier instance.
Expired or invalid metadata is an error; no legacy-signature fallback exists
inside this verifier.

Previously authenticated root rotations survive reconstruction of the client.
A newer root supplied by an upgraded binary supersedes an older cached root.
Tests cover unauthorized root replacement, dual-authorized rotation, tampering,
timestamp rollback, cancellation, candidate substitution and refreshing expired
local freshness state. The expiry fixture is not a complete six-month-offline
fleet/installer qualification.

Target paths use this layout, with each identity component separately bound:

```text
agent/stable/0.32.0/windows/amd64/binary
```

The local routine-publishing command runs from the application's `common`
module. For a new publication, provide an inventory JSON array:

```powershell
go run .\cmd\update-metadata -repository C:\release\metadata -root C:\release\public\1.root.json -keys C:\release\secrets -inventory C:\release\inventory.json
```

Each inventory entry has `target` and `file`. The `target` fields are
`component`, `channel`, `version`, `platform`, `arch`, `format`, `sha256` and
`size_bytes`; `file` is the local artifact path. Only the signed identity,
length and hash enter published metadata, not the local filename.

Routine signing reads separate PKCS#8 Ed25519 `targets.pem`, `snapshot.pem` and
`timestamp.pem` files outside the published metadata directory. It neither
generates nor loads a root private key. Keys must come from the owner's secret
store into a protected temporary signing workspace; do not upload them.

Omit `-inventory` for a freshness-only refresh of an **existing** publication.
The command refuses to initialize missing freshness state silently. Targets,
snapshot and timestamp expiries are respectively 180, 30 and 7 days; the
production refresh schedule must run comfortably within the shortest expiry
even without new application releases.

Publishing authenticates and restores the target set from the last timestamp's
versioned dependencies. It preserves earlier targets, increments versions,
skips orphaned target/snapshot versions after an interrupted publication, and
refuses different bytes for an existing release identity or root version.
Missing/corrupt committed dependencies fail visibly instead of resetting state.
Retain the authoritative publishing workspace and versioned history; restoring
an arbitrarily stale backup is not a safe version-recovery procedure.

The caller must serialize publishing jobs. Upload immutable versioned metadata
first and `timestamp.json` last. Metadata writes use synced temporary files and
rename; directory power-loss durability and multi-process workspace locking
are not provided by this foundation. Missing initial commit state requires
restoring the last publication rather than guessing a new baseline.

The offline `InitializeRoot` and `RotateRoot` library operations use the
standard TUF types and signature checks. The initial single-maintainer policy
has distinct keys per role and a one-signature root threshold. Root rotation
requires both old and replacement root authorization and retains routine role
keys. Multi-custodian threshold ceremonies and routine-role replacement require
additional tooling; backups are not additional signers.

Remaining release gates include actual Agent manifest-boundary integration,
unchanged Server metadata mirroring, public-root embedding, protected release
and scheduled refresh automation, offline owner provisioning/recovery tooling,
package authentication and real supported-upgrade qualification. No production
keys, hosting configuration, workflow permissions or secrets are created by
these library tests or this command.

### Follow-up risks and architecture

- Legacy Agents already stuck in their own terminal-state gate cannot be repaired
  by changing Server responses; an external restart or intervention may be needed.
- Legacy MSI bootstrap limitations require installation-specific validation.
- Package-manager installation authenticates repository packages separately;
  verifying a raw discovery binary does not authenticate the installed package.
- Cache verification currently hashes matching candidates during manifest checks.
  Measure fleet-scale I/O before introducing an invalidation-aware verified index.
- Bounded process waits are not equivalent to an independent recovery service;
  forcibly interrupting package installation can require package-manager repair.
- Linux group cancellation cannot guarantee termination of root-owned descendants
  when the Agent lacks permission. A privileged supervisor should own that
  transaction; command deadlines alone do not establish safe rollback.
- The Windows raw-binary stop loop is bounded; MSI deadlines and durable
  helper-to-Agent failure reconciliation remain unresolved release work.
- Old Server-signed manifests and their database-held keys remain legacy
  compatibility machinery, not the future publisher trust authority.
- Routine-role key replacement must verify the previous publication against its
  previous authorized root before moving authority to new role keys. The current
  publisher deliberately rejects old state unauthorized by its supplied root;
  do not work around that error by deleting publisher state.

## Goals

- Enable the PrintMaster **server** to self-update without user intervention (non-Docker deployments).
- Allow the server to orchestrate **agent** updates, including fully background installations triggered from the fleet UI.
- Provide **customized installers** (per fleet/tenant) that embed configuration data and can be used for both onboarding and update flows.
- Maintain **trust** without external code-signing certificates by using server-signed manifests and checksum validation.
- Keep Docker deployments opt-in / manual since they already rely on image pulls.

## High-Level Architecture

1. **Release Intake**
   - Server polls the authoritative release feed (GitHub or artifact bucket) for new agent/server versions.
   - Downloaded artifacts are verified with upstream checksums and cached per platform.
   - Within the same major/minor/patch Dev line, Agent update manifests select the latest publication time, not the commit hash or manifest signing time. Stable and Beta retain semantic-version ordering.

2. **Manifest Signing**
   - Server maintains an Ed25519 signing key pair.
   - For each cached version the server emits a manifest describing version, platform, SHA-256 hash, and supported minor line.
   - Agents embed the public key; all update/install downloads must match a signed manifest.

3. **Installer Repackaging**
   - When the admin requests an installer, the server unwraps the official artifact, injects fleet-specific config (join tokens, CA path, policy), then repackages it.
   - Resulting artifacts are available via authenticated endpoints (e.g., `/api/v1/installers/{fleet}/{platform}`) and reused by auto-update flows.

4. **Server Self-Update**
   - Non-Docker deployments download the new server build, verify the manifest, stage it, and swap binaries with automatic rollback.
   - Docker deployments are detected (env flag / filesystem marker) and instructed to update through container orchestration instead.

5. **Agent Auto-Update**
   - Agents poll the server (per policy) for new updates and fetch repackaged installers.
   - A different server-selected Dev build on the same version line is eligible regardless of hash ordering, subject to the existing version pins. Older version lines are not automatic upgrades.
   - Updates respect version pinning strategy (major: stay on 0.x, minor: stay on 0.9.x, patch: stay on 0.9.14) unless an admin explicitly initiates an upgrade.
   - The agent stages the new build, replaces the running service, and reports status.

6. **Policy & UX**
   - Fleet setting controls cadence (disabled, daily, weekly, monthly) plus target minor version.
   - Agents can override locally (important for air-gapped installs) but default to fleet policy.
   - Server UI shows per-agent status, current/target versions, manual "Update now" actions, and install links.

## Implementation Checklist

### Phase 1 – Foundations & Policy

- [x] Define fleet-level auto-update settings (cadence, version pinning strategy: major/minor/patch, allow-major-upgrade flag) in server storage schema.
- [x] Add maintenance window scheduling (time-of-day preferences, timezone support) to avoid business-hour disruptions.
- [x] Add rollout control settings (staggered deployment, max concurrent updates, jitter, emergency abort flag) to prevent bandwidth saturation.
- [x] Add agent-side configuration fields for local override, defaulting to fleet settings when connected.
- [x] Expose settings in server admin UI + API.
- [x] Add and validate tests for this phase.

### Phase 2 – Release Intake & Manifests

- [x] Implement server job to fetch official release metadata + artifacts for each supported platform.
- [x] Fetch and cache release notes/changelogs alongside artifacts for UI display and audit logs.
- [x] Store artifacts in a versioned cache with integrity data (SHA-256, upstream signature if available).
- [x] Introduce manifest-signing module (Ed25519 key generation, rotation, storage) and embed public key in agent + server binaries.
- [x] Provide CLI/admin endpoints to rotate signing keys and regenerate manifests.
- [x] Add and validate tests for this phase.

**Phase 2 Notes:**
- Server exposes `/api/v1/releases/signing-keys` (list/rotate) and `/api/v1/releases/manifests` routes gated behind `releases.read/release.write` scopes.
- Release intake worker now ensures manifests are generated for every cached artifact; regeneration re-signs existing manifests on key rotation.
- Tests cover storage schema v5, manager rotation/regeneration, and HTTP handlers to prevent regressions.

### Phase 3 – Installer Repackaging Service

- [ ] Build packager that unpacks cached release, injects fleet config (join token, CA path, policy), and repacks per OS (ZIP/TAR/MSI wrapper).
- [x] Ensure sensitive data (tokens) are encrypted at rest within server cache.
- [ ] Add authenticated download endpoints for the customized installers + raw update bundles.
- [ ] Surface "Download installer" button in server UI referencing those endpoints.
- [ ] Add and validate tests for this phase.

**Phase 3 Notes:**
- Packager manager scaffolding is in place with cache TTL enforcement, builder registry, and encryption-at-rest. Remaining work covers config injection, fleet-aware repackaging, API surface, and UI hooks.

### Phase 4 – Server Self-Update (Non-Docker)

- [x] Add component that checks for new server version respecting target minor. *(Target-minor enforcement still TODO; current implementation compares semantic versions and records skipped/pending runs.)*
- [x] Download + verify manifest/hash, stage binary, back up current version.
- [x] Integrate with Windows service + Linux systemd to perform controlled restart and rollback on failure.
- [x] Detect Docker environments and disable automated self-update, displaying guidance instead.
- [x] Record and expose self-update history/status in UI/logs.
- [x] Add and validate tests for this phase.

**Phase 4 Notes:**
- `selfupdate.Manager` now creates `self_update_runs` records each tick, evaluates cached release artifacts (platform/channel aware), stages newer versions by copying the cached artifact into a run-scoped staging directory, validates the SHA-256 from the manifest, and keeps a backup of the current binary for rollback.
- Runtime detection now skips self-update work inside container/CI environments so Docker users continue to follow image-based upgrades.
- A detached helper binary is spawned with a signed instruction file to stop the Windows service or systemd unit, replace the on-disk binary, restart it, and roll back to the backup if the restart fails. Helper runs record success/failure back into `self_update_runs` so history is persisted automatically.
- Self-update history is exposed via `GET /api/v1/selfupdate/runs` and displayed in the Settings > Updates panel in the server UI.
- Tests cover candidate selection, staging/backup flows, container skips, and the new apply-launch handoff.

### Phase 5 – Agent Auto-Update Worker

- [ ] Implement agent background worker honoring fleet/local cadence and maintenance windows.
- [ ] Pre-flight checks: verify sufficient disk space for staging + backup before starting download.
- [ ] Request manifest + download from server with exponential backoff retry (max attempts configurable), verify signature/hash, stage update safely.
- [ ] Support HTTP range requests for partial download resume on interrupted transfers.
- [ ] Use existing install scripts (PowerShell/service manager) to replace binaries and restart.
- [ ] Post-update health check: verify server connectivity and basic functionality after restart; trigger rollback if checks fail.
- [ ] Keep previous version for rollback; automatically retry on transient failures.
- [ ] Report progress and telemetry to server (e.g., pending/downloading/installing/restarting/done, download time, success/failure) for UI consumption and metrics.
- [ ] Add and validate tests for this phase.

### Phase 6 – UI & Operational UX

- [ ] Server UI: dashboard widgets showing current vs target versions, rollout status, and manual update controls.
- [ ] Display cached release notes/changelogs for pending updates before admin approval.
- [ ] Implement staggered rollout UI controls (percentage/batch size, delay between waves, emergency abort button).
- [ ] Add telemetry dashboard showing update success rate, average download time, rollback frequency per version.
- [ ] Agent UI: settings page showing current policy, next scheduled check, and last update result (read-only unless override enabled).
- [ ] Notification/log integration (e.g., toasts, audit log entries) for update events with changelog snippets.
- [ ] Add and validate tests for this phase.

### Phase 7 – Testing & Rollout

- [ ] Unit/integration tests for manifest signing, download verification, and packaging logic.
- [ ] End-to-end tests (possibly via CI) that spin up server + agent, trigger update, and assert version change.
- [ ] Documentation updates (admin guide, deployment notes) covering new features.
- [ ] Gradual rollout plan (beta fleet, staged deployment) before enabling for all installations.
- [ ] Add and validate tests for this phase.

## Edge Cases & Notes

- **Docker/Kubernetes**: provide environment flag (`PM_DISABLE_SELFUPDATE=1`) and UI hints; rely on container image updates.
- **Schema migrations**: auto-updater must confirm compatibility before applying a version with DB changes (migration gating and backups).
- **Offline agents**: if unable to reach server, fall back to local override schedule or postpone until connectivity returns.
- **Security posture**: regular key rotation, audit of downloaded artifacts, and strict auth on installer endpoints are mandatory.
- **Rollback triggers**: define explicit criteria for automatic rollback (service start failure, post-update health check failure, connectivity loss).
- **Bandwidth management**: staggered rollout with jitter prevents simultaneous downloads from overwhelming server/network; configurable per fleet.
- **Maintenance windows**: respect local time zones and business hour preferences; defer updates outside configured windows.
- **Network resilience**: exponential backoff with jitter for retries; support HTTP range requests to resume interrupted downloads.
- **Disk constraints**: pre-flight disk space checks prevent partial installs; alert admins when agents lack sufficient space.
- **Version control**: admins can pin to major, minor, or specific patch versions for validation/testing before fleet-wide rollout.
- **Telemetry feedback loop**: track success rates and download metrics to identify problematic releases early and inform rollout decisions.

## Force Reinstall Controls

### Manual release-channel installation and policy consolidation

Persistent-channel/legacy bootstrap follow-up landed at [589e269](https://github.com/Printmaster-Org/printmaster/commit/589e269fb1cd18a48383cd6e757bc32bdab4159b), separate from the original one-shot channel slice. Fleet default is in JSON-managed Features, not a SQL update-policy schema change; old Agents use existing force/manifest paths. See the updated configuration/protocol guides for exact precedence, status/error and compatibility semantics.

Source: [685f0fe](https://github.com/Printmaster-Org/printmaster/commit/685f0feccd16b02916cb814f6cdea6d91693738c). Validation passed full Agent and Server Go suites, focused channel/operation race-detector tests, 47 JavaScript unit tests, and 78 progressive inventory/context-menu browser tests across six configured projects (six mobile context-menu cases intentionally skipped). Regressions cover invalid/mismatched channel rejection, unchanged scheduled channel, tenant command denial, prerelease setting validation/restart metadata, cached beta re-signing/stable isolation, modal cancellation and policy-save preservation of maintenance/rollout fields. These are source/mock/fixture results, not a real multi-platform installation or package-repository compatibility certification.

The Server **Update Agent** action now prompts for configured-channel checks or a one-shot **Stable**, **Beta / Release Candidate**, or **Development** install. Explicit selection dispatches `install_channel` with `channel` and `reason`, while the default preserves `check_update`. Server validates exact `stable`/`beta`/`dev` values after role/tenant authorization; payload data cannot replace the authorized command name. Agent validation repeats before dispatch. The manager retains whole-operation ownership, selects the channel without mutating scheduled configuration, rejects wrong-channel manifests, then reuses the existing forced-install pipeline. Existing forced-install preflight/integrity/platform limitations remain; this is not a new installer/repository implementation or signature-verification certification.

Beta/rc/other prerelease artifacts no longer fall into stable intake. Existing cached channel metadata is repaired and affected manifests re-signed during sync; stable manifest selection excludes stale mislabeled prerelease versions. Development remains its own `dev` channel. Server UI exposes the existing prerelease-intake setting with explicit restart requirement, validation and environment-lock handling.

Release artifacts gained a format identity at [bb99bbe](https://github.com/Printmaster-Org/printmaster/commit/bb99bbe850ce2921f4e730b1751d92ec1d1bb361). Previously the Windows `.exe` and `.msi` shared one `(component, version, platform, arch)` cache key, so whichever was cached last replaced the other and its manifest. The shared `updatepolicy.ArtifactFormat` contract (`binary`, `msi`, `deb`, `rpm`) is now part of the artifact/manifest unique key and the signed payload. Intake runs one plan/cache flow for both background and UI-triggered syncs, and it skips `.deb`/`.rpm` assets because package repositories deliver them. MSI-installed Agents request `msi`, while the Server's self-updater only considers raw binaries. Startup migrations rebuild legacy SQLite tables and add the column plus named unique indexes on Postgres, then reclassify legacy rows. Regressions cover EXE+MSI+DEB+RPM intake, per-format manifest selection, handler validation/authentication, the SQLite legacy-table migration and Agent format requests. Postgres migration coverage runs in CI integration tests. See [update artifact formats](/api/protocol/#update-artifact-formats).

Install-method channel reconciliation landed at [73197f9](https://github.com/Printmaster-Org/printmaster/commit/73197f94515e75003f8103372d3de6aa78b1bc9c). `agent/autoupdate/install_channel.go` owns one rule: MSI and package-managed installs can only follow Stable, because Beta/Dev publish no MSI and no repository packages. `operationChannel` constrains those installs to Stable. `fetchManifest` marks the request as an explicit Stable channel so a Fleet-managed Beta/Dev setting on the Server cannot re-resolve it, and it logs a warning when it overrides a selection. `ForceInstallLatestFromChannel` rejects explicit Beta/Dev with `CHANNEL_UNSUPPORTED` before contacting the Server. `ManagerStatus.channel_note` explains the constraint in the Agent UI. Package-manager updates now require an exact version: the DNF/yum versionless upgrade fallbacks and the defensive generic-upgrade path in `applyUpdate` were removed, because they could install a release other than the selected manifest. Unit tests cover scheduled requests for binary/MSI/APT installs, explicit rejection and telemetry, explicit Stable, and the exact-version guards.

Fleet Settings now owns the only complete scope-aware policy editor. Removed reduced duplicate loader/renderer/save code, preventing that editor from overwriting maintenance windows and rollout settings with defaults. The cache panel remains separately available as **Agent Release Cache**. Policy schemas/storage are unchanged; channels selected for manual installs are not a new fleet policy field.

Older Agents still require updating before accepting `install_channel`; they do not interpret it as `force_update`. The persistent-channel follow-up removes that bootstrap requirement for **Fleet-force installs**: save `features.agent_update_channel` under managed Features, then send the existing `force_update`. The updated Server resolves ordinary manifest requests against the authenticated Agent's global/tenant/allowed-Agent settings, overriding its local requested stable channel. Updated Agents additionally read their managed channel for status/checks dynamically. Empty/unmanaged settings preserve local configuration. Explicit one-shot selections send optional `explicit_channel: true` to retain their precedence over the saved default. See [configuration workflow and compatibility](/guides/configuration/#agent-update-channels).

- The server UI now exposes a **Force Reinstall** action on each agent detail view. This button is only enabled when the agent maintains an active WebSocket session so the command can be delivered instantly.
- Clicking the action prompts for confirmation, then issues a `force_update` command over the agent command channel. The payload includes a simple reason tag (currently `server_ui_force_reinstall`) for downstream logging and auditing.
- Upon receiving the command, the agent's auto-update manager bypasses the usual `isUpdateNeeded` guard and downloads/reinstalls the latest manifest even when the reported version already matches. Maintenance-window and version-pin policies are intentionally skipped for this manual override, but disk-space checks, hashing, staging, and telemetry reporting still run.
- The force flow reuses the existing download/staging pipeline, so telemetry and log noise remain consistent with regular updates, and the helper restart logic still ensures the service restarts cleanly after the reinstall.
- Every manual `check_update` or `force_update` invocation now emits a structured audit log entry capturing the actor, agent identity, payload metadata (reason/trigger), and tenant scope so compliance teams can trace both ad-hoc and scheduled rollouts. Future orchestration jobs should call the shared `logAgentUpdateAudit` helper to record automated runs with a `trigger=scheduled` tag.

## Agent UI Self-Update Controls

- The agent settings page now includes an **Agent Updates** panel that surfaces the current/available version, channel, effective policy source, and the timestamps for the last/next scheduled check.
- Status pills reflect the manager lifecycle (`checking`, `downloading`, `applying`, etc.) so desk-side operators can see whether an update is already running before triggering new work.
- The panel polls `/api/autoupdate/status` every 45 seconds and exposes a "Refresh Status" button for on-demand snapshots when troubleshooting.
- Two local actions are available:
   - **Check for Update**: POST `/api/autoupdate/check`, identical to the server-driven `check_update` command.
   - **Force Reinstall**: POST `/api/autoupdate/force` with reason `agent_ui_force_reinstall`, which bypasses version/policy guards but still enforces disk-space, hashing, and restart health checks.
- Buttons automatically disable when the auto-update manager is unavailable (agent offline, policy disabled, etc.) or when a run is already in progress, preventing conflicting operations.
- The Agent manager holds exclusive operation ownership from manifest lookup through installation. Overlapping scheduled checks, manual checks, and forced reinstalls return an `update operation already in progress` error inside the manager; a `pending` status does not release ownership. Requests are rejected rather than queued. Scheduled checks retain their normal rescheduling behavior.
- The local POST handlers above still acknowledge background dispatch with HTTP `200` (`check_triggered` or `force_triggered`), not installation success or a synchronous busy response. A later manager busy error is logged; inspect status/logs before retrying. Server-delivered commands report manager errors through update progress. These write operations are outside the reviewed [Agent OpenAPI read subset](/api/agent/); no route, authorization, or response-schema change is introduced by operation locking.
- Callouts highlight when a newer build is available so onsite staff know when a manual reinstall will have an effect.

This plan should be treated as a living document; check off tasks as they land and adjust phases as we learn more from early prototypes.
