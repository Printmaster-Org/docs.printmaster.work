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

- **Qualified hosting/automation infrastructure (2026-10-19):** independent
  protected custody, lane-serialized workflow, retained exact pending recovery,
  freshness schedule/checks, live failure/recovery issues and authenticated
  B2-to-Server mirror pulls. The isolated disposable-key live matrix passed,
  including interrupted bootstrap, exact fresh-runner recovery, normal version
  advance and read-only health checks. This closes the previously open hosting
  item; production keys/real root/credentials/activation remain deferred until
  the earlier code and qualification gates below pass.
  See [live evidence](/development/update-hosting/#qualification-evidence).
- **Implemented application policy and installation descriptors (unreleased):**
  one no-downgrade/pin policy covers scheduled, manual, forced, channel-switch,
  retry and final apply paths. Same-line Dev changes use publisher-signed release
  sequences, not hash ordering or Server timestamps. Final installation checks
  bind the run, publisher identity, staged length/hash, destination and exact
  previous backup. Recorded failed-install recovery may restore that previous
  artifact; it is not an arbitrary downgrade authorization. See
  [application policy and descriptors](#application-policy-and-installation-descriptors-unreleased).
- Implemented: durable ordered Agent/Server progress, retryable terminal outcomes
  and running-version validation across restart.
- Implemented: validated artifact delivery/cache repair and truthful intake errors
  ([source 1765ea9](https://github.com/Printmaster-Org/printmaster/commit/1765ea9f60fcc0011b7d0e018a0c2c4c4bd1c731)).
- Implemented: shared TUF verification, routine metadata publishing and offline
  root initialization/rotation primitives. This is a tested foundation, **not
  a provisioned production signing service**.
- Implemented: fail-closed local TUF metadata integrity checkpoints in the shared
  verifier. See the resumed trust-state slice below; updater-state permissions
  are now enforced by the Agent, with installer/platform qualification tracked
  below.
- Implemented client clock/expiry diagnostics, persistent successful-verification
  time and offline exact-checkpoint inspection/repair. The owner-approved scope
  refuses missing/corrupt checkpoint replacement and never resets version/time
  floors; see [client trust lifecycle](#client-trust-lifecycle-2026-10-22-unreleased).
- Implemented: mandatory injected publisher authorization in Agent candidate
  selection and pre-install execution, with explicit unprovisioned-trust and
  unauthenticated-package blocking. Production root provisioning and
  signed metadata activation are still pending, so current default builds cannot perform
  unattended updates.
- Implemented: embedded-root verifier construction and machine-authenticated
  unchanged public metadata delivery. The embedded root intentionally remains
  unprovisioned until owner key setup; no signing/hosting activation is implied.
- Implemented: offline owner initialization/root-rotation CLI, restored-key
  verification and public-root release guards. These have only been exercised
  with disposable keys; production provisioning and activation remain pending.
- Implemented: offline replacement of all routine role keys and explicitly
  pinned recovery/transition of publisher state, retaining targets and metadata
  versions. See [signing operations](/development/update-signing-operations/);
  this does not close incident response or protected publishing automation.
- Implemented and live-qualified with disposable keys: local managed publication,
  B2 delivery/preflight, bounded independently pinned retained-state restoration,
  protected GitHub publication custody and serialized hosting automation. Earlier
  primitive-specific limitations below are historical; use the
  [current hosting runbook](/development/update-hosting/) and
  [custody runbook](/development/update-publication-custody/) for the qualified
  boundary. Both publisher opt-ins are disabled after rehearsal; production
  credentials/root/activation remain unprovisioned.
- Qualified Linux native helper/Manager handoff and explicit owner repair on
  disposable Ubuntu DEB/Fedora RPM systemd environments. See
  [native lifecycle evidence](#native-systemd-lifecycle-qualification-unreleased-qualified-scope).
  Production trust/socket activation remains off.
- Qualified with disposable keys and pinned source contracts: 0.31.0/0.31.1
  manifest compatibility/fail-closed Manager entry points and a genuinely
  historical six-calendar-month trust checkpoint across expired roots,
  root/routine-key replacement, publisher repair and restart/replay. These are
  protocol/trust fixtures, **not native legacy installer migration**; see the
  [migration qualification and owner procedure](/guides/update-migration/).
- Required before release: final adversarial/cross-platform installer
  qualification, native supported 0.31.x migration rehearsals, TUF publisher metadata
  and client verification, production root provisioning and restricted routine
  signing/refresh.
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

Dependency vulnerability alerts will be triaged and addressed in the final-beta/
pre-0.32.0 release pass, per the owner's 2026-10-19 sequencing decision. They
remain a release gate, not accepted or resolved risk; this updater slice does
not investigate or change dependencies.

### Recommended execution order and gate status

Hosting, application policy/descriptors, and the original installation-permission
gate are complete within their documented scopes. The permission gate closed
on 2026-10-20 with Linux/macOS separate-identity execution and an actual Windows
MSI/SYSTEM access-control check; see the
[permission qualification matrix](#permission-qualification-matrix).
The remaining work is ordered by actual prerequisites, not by the historical
checklist numbering:

1. **Qualified on the disposable Windows test Agent:** failure-safe
   Windows binary/MSI helper handoffs, bounded deadlines and durable
   run-bound outcomes, including real transaction failure recovery and
   Manager startup reconciliation; see
   [Windows MSI transaction qualification](#windows-msi-transaction-qualification).
2. **Qualified on disposable Ubuntu/Fedora systemd environments:** Linux
   DEB/RPM helper packaging, unprivileged Manager handoff, durable root outcomes,
   real service/dependency failure handling, sudo revocation and explicit owner
   repair. See [native lifecycle evidence](#native-systemd-lifecycle-qualification-unreleased-qualified-scope)
   for the exact scope; production activation remains off.
3. **Implemented and regression-tested within the approved conservative scope:**
   client trust-state lifecycle, clock/expiry diagnostics and explicit
   exact-retained-checkpoint repair. Missing/corrupt checkpoint authority stays
   blocked rather than enabling an unsafe reset; see
   [client trust lifecycle](#client-trust-lifecycle-2026-10-22-unreleased).
4. **Implemented and regression-tested:** truthful bounded Agent/Fleet update
   UX and explicit upstream sync replay. See
   [bounded update UX](#truthful-bounded-update-ux-2026-10-22-unreleased)
   and the [operator guide](/guides/updates/).
5. **Protocol/trust fixtures and bounded native legacy migrations qualified:**
   pinned 0.31.0/0.31.1 request/response compatibility, fail-closed mixed versions
   and six-month-offline root history/recovery. See
   [migration boundaries](/guides/update-migration/). Do not call the full
   supported installer migration matrix complete. All four actual-release
   Linux DEB/RPM migration jobs passed in run `39814950321`, and actual legacy
   Windows MSI migration/transaction rollback passed both stable baselines in
   runs `39820122209` and `39820711088` (including delayed-start/recovery-policy
   SCM evidence). Raw Windows service installs, macOS and additional architecture
   migration coverage remain separate gates; see the migration guide for exact
   boundaries.
6. **Dependency remediation qualified in full CI:** shared
   crypto/signing dependencies aligned across consumers, vulnerable development
   formatter removed, and Go 1.27.3 required for patched standard-library builds.
   See [dependency triage](#dependency-security-triage-2026-10-22).
7. Explicitly approved production trust provisioning, verified independent
   encrypted backups, public-root embedding and scoped credentials; activation
   initially remains off.
8. Final adversarial/platform/service/package/release qualification and go/no-go.
   Production activation requires separate explicit approval after the gates.

Each item includes its own regression tests and documentation. Final
qualification is not permission to defer testing. No production ceremony is
needed to work on the next code gate.

### Dependency security triage (2026-10-22)

The source repository had 14 open Dependabot alerts: seven critical, two high
and five medium. Thirteen were SSH/SSH-agent advisories against the standalone
`common` module's indirect `golang.org/x/crypto` 0.50.0 requirement. The Agent
and Server already selected 0.58.0, and Windows/Linux/macOS package-graph
inspection found no imports of the affected SSH packages. Advisory severity
was not evidence of a reachable deployed exploit. The shared requirement is
now aligned at 0.58.0; Sigstore 1.11.1 and its required dependencies are
synchronized in all three module manifests/sums.

The remaining alert affected development-only `sprintf-js` 1.0.3 through
coverage configuration tooling. No fixed formatter release was published:
the latest 1.1.3 was also affected. A scoped YAML-loader dependency replacement
removes the vulnerable package; it is not an alert dismissal. Playwright's
existing patch update is also incorporated. See the
[testing guide](/development/testing/#dependency-security-checks) for the
compatibility regression and required CI scanning.

An official Go vulnerability scan also found nine reachable standard-library
advisories when using Go 1.27.0, spanning HTTP/HTTP2 denial of service and
connection handling, MIME limits, TLS and compromised intermediate-certificate
distrust. The module minimums and all application build/qualification pins
now require Go 1.27.3, including Docker builders and mock-E2E tooling. Local
rescans of all four modules with 1.27.3 report zero reachable or imported-package
findings. The scanner still reports module-only
[GO-2026-5932](https://pkg.go.dev/vuln/GO-2026-5932) because `x/crypto` contains
unmaintained OpenPGP code: that package is not imported, has no fixed version,
and is not used for updater trust. The required crypto module cannot simply
be removed. This remains an explicit non-reachable disposition, not a claim
that the upstream package is safe.

Existing source dependency PRs overlap these direct-main changes; their older
checks include stale lint failures and an untidied consumer module. No failing
check is bypassed and no new review PR is needed. Both existing documentation
dependency/workflow PRs passed their checks and were merged. The implementation is
[source 94fdf96](https://github.com/Printmaster-Org/printmaster/commit/94fdf967e503a18898a14fab30d85892d67d70c2).
GitHub confirmed zero open source dependency alerts after processing that
commit; Dependabot automatically closed all three superseded source PRs.
Both npm audits report zero vulnerabilities. The docs validation run
`39827148855` passed. Source run `39827294892` passed every Go/Jest/integration
and native-permission job, plus three browser shards; remaining runners stalled
in Azure-mirror APT downloads before tests and the run was cancelled.
The bounded retry `39829946274` passed five browser shards but failed the sixth
at its OS-install deadline on the same mirror. The final source
[1c7f292](https://github.com/Printmaster-Org/printmaster/commit/1c7f292138c3bdf501640c2e2213b9938406a983)
selects Ubuntu's upstream HTTPS mirror only in disposable browser runners.
**Full [CI run 39831072689](https://github.com/Printmaster-Org/printmaster/actions/runs/39831072689)
passed**, including all six browser shards, every Go module and its required
vulnerability scan, Jest, PostgreSQL, Docker E2E, three native-permission jobs
and the CI Passed aggregate. OS-dependency installation took 46-60 seconds
across the six runners. Related docs CI `39831035172` also passed.
Already deployed binaries require an approved rebuild/release and deployment;
production signing, root provisioning and unattended activation remain off.

### Repository package authentication boundary (unreleased)

Implementation: [source commit 7f68fa1](https://github.com/Printmaster-Org/printmaster/commit/7f68fa1f5154b6c06ae13adc90d24914f955b842).

The owner selected repository-owned APT/DNF/YUM delivery on 2026-10-20, not
fleet delivery of DEB/RPM assets. The first code slice adds
`updatetrust.Client.AuthorizeFile`: refresh/authenticate the exact TUF target,
then verify the length and SHA-256 of an already-open regular file without
reopening its pathname or changing the caller's offset. Cancellation and
read failures return no authorization. DEB/RPM identities are separate from
discovery binaries, including version, channel, platform, architecture and
format; authorizing a binary does not authorize the package containing it.
Publisher inventory must include the actual repository package bytes.

The old, unreachable version-only `apt-get install`, `dnf install` and
`yum install` methods are removed. A second repository resolution after
checking a download could install a different artifact, even for the same
version. Tests keep all three package handoffs explicitly fail-closed.
This slice does **not** enable Linux package auto-update or change repository,
sudoers, service-account or fleet-manifest configuration.

Repository acquisition: [source commit 3857a3c](https://github.com/Printmaster-Org/printmaster/commit/3857a3c0a4aa831d8f19789848c3b9ba09e6f1fb).

The next acquisition slice now downloads without installing: `apt-get download`
pins `printmaster-agent:<native-arch>=<version>`, `dnf download` selects the
version and native architecture, and YUM uses `yumdownloader`. Each attempt
uses a new private workspace and accepts exactly one regular package file.
Native `dpkg-deb`/`rpm` queries must match the fixed package name, selected
Stable version and architecture. RPM epoch must be zero and release must
match the build scripts' `1` with optional distribution suffix. Supported
architectures map Go `amd64`, `arm64`, `arm` to their Debian/RPM names.
Prerelease/noncanonical versions and unknown identities fail before commands.
No sudo, metadata refresh, dependency install or versionless fallback is run.
Missing native download tooling/plugins fails explicitly.

The exact package file is then authenticated using its own TUF target, not
the discovery binary's digest. Command cancellation inherits the operation
context, deadlines/output remain bounded, and the temporary package workspace
is cleaned on success or failure. A successful acquisition still returns a
visible blocked-installation error: it does not write a pending installation,
restart the service or claim an installed update.

Acquisition tests use real disposable-key TUF verification with simulated
native download/query commands. They assert exact command arguments and
architecture mappings, reject missing/multiple/nonregular downloads, native
identity/epoch/release mismatches, substituted bytes, command failures and
cancellation, and verify workspace cleanup. The command runner separately
executes real subprocesses to verify working-directory and parent-cancellation
handling. The full Windows updater suite, vet/staticcheck and documentation
checks passed; Linux tests cross-compiled only. These fixtures are not proof
that native APT/DNF/YUM behavior has been qualified on Linux.

#### Root-side package intake and immutable-input isolation (unreleased)

Implementation: [source commit 2a72cac](https://github.com/Printmaster-Org/printmaster/commit/2a72cac0bfb9f10a68b1c5f5acbdbfef21461b0a).

Acquisition now copies the open repository input to a private, read-only
snapshot before TUF file authentication. Hashing and copying preserve the
input offset and honor cancellation; inputs are limited to 512 MiB. The
consumer sees only the independently authenticated snapshot, not a repository
pathname. Changing the original download after verification cannot change the
snapshot. Private snapshots are removed after consumption or failure, and
cleanup failures remain visible.

The Linux-only `WithPrivilegedRepositoryPackage` intake requires root and
accepts only `agent/stable`, canonical Stable versions, the running helper's
Linux architecture and DEB/RPM formats. Its trusted root, metadata URL, state
directory and consumer come from trusted helper code/configuration, **not**
the service user's request. It creates its own TUF client/cache/integrity
record and never imports the Agent's authorization receipt or cache.
Existing parents must already exist and be root-owned non-linked directories;
root-owned sticky temporary ancestors are allowed. The dedicated state tree
must be root-owned, with private directories and only ordinary single-link
non-executable files that are not group/other writable. Public-metadata files
may retain the TUF library's `0644` mode inside the private root-only directory.
Unsafe existing state is rejected, never adopted or repaired.
An OS file lock serializes root-side verification/consumption and releases
on process exit without deleting trusted metadata.

The private snapshot remains present only for the synchronous consumer's
lifetime. This boundary is an in-process API, not a CLI or sudo permission.
No native install command, dependency resolution, package script, service
restart or pending installation is enabled by it. Read-only modes are not a
defense against a hostile root process; protected root ownership is part of
the threat boundary. This is not a power-loss-safe installation transaction.

The Agent CI job now builds a test executable and uses a narrowly selected
root-only test set on the disposable hosted Linux runner: independent
disposable-key TUF intake, source mutation, lock contention, trust-record loss
and unsafe state. It does not invoke native installers or touch host services.
This step is prepared but has not run remotely in this local-only slice.
Locally, real TUF snapshot/acquisition tests and the full Windows updater
suite passed with vet/staticcheck; Linux tests cross-compiled and Linux vet
passed. Linux staticcheck also exposed pre-existing Unix Windows-helper stub
warnings (`SA4023` and `ST1005`), outside that intake slice. The later Linux
qualification follow-up below resolves them without diagnostic suppression.

#### Native package consumer and privileged policy checks (unreleased)

Implementation: [source commit cae4bb4](https://github.com/Printmaster-Org/printmaster/commit/cae4bb484c0f40eddc4c949aa613e86fc391a258).

An in-process `InstallPrivilegedRepositoryPackage` consumer now builds on
the independent root intake above. It rechecks native package fields from the
authenticated snapshot, queries the native installed-package database and
applies the existing application policy using a trusted helper-supplied policy
provider. That provider must read root-controlled configuration, not the
service user's mutable policy/cache or request. Invalid/unavailable policy,
emergency abort, downgrades and disallowed pins fail before installation.
Equal-version packages require owner-managed repair; there is no inferred
reinstall authorization from a binary digest. Noncanonical installed versions,
RPM epochs/releases outside the supported shape and partially installed Debian
packages also require owner-managed migration/repair.

The consumer invokes only the exact root-owned snapshot with
`dpkg --refuse-downgrade --install -- <snapshot>` or
`rpm --upgrade -- <snapshot>`. It does not run APT/DNF/YUM again, fetch
dependencies, remove packages or bypass dependency checks. Debian's refusal
flag also protects against a concurrent owner-managed transaction moving the
installed version ahead after the policy check. Native command failures remain
visible, and a successful command must be followed by an installed identity,
architecture and version check. This is not startup validation.

The privileged runner permits only fixed `/usr/bin/` package executables,
checks their protected root ownership and starts them with a minimal explicit
environment, rather than inheriting service-user loader/plugin/configuration
variables. Commands retain bounded deadlines and output. Deadline termination
can leave package-manager state needing repair; maintainer scripts may restart
the service or terminate a parent. Durable intent/outcome records now track
this boundary, but do **not** make the native package transaction atomic.
No helper CLI, sudo permission or automatic-update entrypoint invokes this
consumer. The existing Agent handoff still fails closed.

Portable tests simulate native commands while checking exact query/install
arguments, pre/post identity, supported policies, database/command failures,
snapshot substitution and cancellation. Full updater tests and Windows
vet/staticcheck pass; the Linux implementation cross-compiles and passes vet.
No real DEB/RPM transaction or hosted Linux runtime is qualified by these tests.

#### Native transaction records and interrupted-install blocking (unreleased)

Implementation: [source commit e1f251e](https://github.com/Printmaster-Org/printmaster/commit/e1f251ed1d91d28165919d9b4d68de06d51b15bb).

The staged root installer now writes `native-transaction.json` in its protected
state directory, while holding the same intake lock. Immediately before the
native install command, it persists a schema-versioned record containing a
random run identifier, the authenticated target identity, previous installed
version, UTC timestamps and phase `installing`. File sync, atomic rename and
parent-directory sync must succeed before the installer runs. Persistence
errors stop the operation; temporary-file cleanup and close failures are
surfaced rather than ignored.

After native installation and database validation it records
`awaiting-startup`, **not** update success. A command error, cancellation or
post-install validation failure records `recovery-required`. Outcome writes
are attempted even when the command context is cancelled; failure to save an
outcome is joined with the original installation error. If the helper exits
before recording an outcome, the previous `installing` intent remains.
No command output or untrusted policy is stored in the journal.

Any existing transaction file, including malformed content, blocks a new
installation until the explicit startup-confirmation path below completes.
Neither native success nor a fresh helper process implicitly clears or retries
a previous run. There is intentionally no automatic journal reset, package
rollback, repair command or recovery CLI yet. Preserve failed/indeterminate
root-owned records and inspect package database/service state before repair.
Snapshots are still temporary and are not retained
as authorized rollback artifacts. This is durable evidence and conservative
retry blocking, not power-loss-safe installation or unattended recovery.

Portable simulated-command tests cover intent ordering, write failure before
modification, outcomes after native/post-check failures and cancellation,
combined installer/journal errors, and no journal activity on policy rejection.
Linux journal tests cover persisted identities/phases, private permissions,
invalid transitions, stale/corrupt record blocking and failed writes. They are
included in the hosted intake test selector; locally they have cross-compiled
only in that original slice. The inspection slice below subsequently ran this
selection on Linux. Native DEB/RPM runtime qualification remains open.

#### Protected native transaction inspection (unreleased)

Implementation: [source commit ed6d1d9](https://github.com/Printmaster-Org/printmaster/commit/ed6d1d9cb67f75fe5faa24997ace9f552a730ebd).

`InspectPrivilegedRepositoryPackage` now reads existing evidence offline under
the same root-owned state lock as installation. It does not initialize TUF,
create a missing state tree, run native package commands or alter the journal.
It rejects oversized/noncanonical JSON, unknown or duplicate fields, unsupported
schemas/phases, malformed run/digest identities, wrong platform/channel/architecture,
invalid timestamps and non-upgrade version ordering. Corrupt evidence remains
in place and blocks further installs; inspection is not permission to reset it.
Only trusted helper configuration supplies the state directory. No CLI, sudo
or HTTP surface has been added.

The Linux root intake, state-isolation, journal and inspection tests passed in
the existing Ubuntu WSL distribution using temporary test directories, without
running installers or touching services. This adds actual Linux file-sync,
lock and ownership evidence, not native DEB/RPM transaction qualification.

#### Read-only native recovery assessment (unreleased)

Implementation: [source commit f5a19c5](https://github.com/Printmaster-Org/printmaster/commit/f5a19c56fd8e2ae3a9f2338e0437fc6d68382ae7).

`AssessPrivilegedRepositoryPackage` uses the same protected state lock and
strict journal reader, then queries only the installed `printmaster-agent`
identity through the fixed native tools. Installation and recovery now share
the exact native query/parser, including architecture, Debian installed status
and supported RPM epoch/release checks. It reports `candidate-installed`,
`previous-installed` or `owner-repair-required` for a different installed
version. None of these is a claim about the running service or authorization
to retry. Missing/broken/ambiguous package database results fail explicitly.

Assessment does not install, restart, fetch metadata, clear records or roll
back. All phases remain blocked for another install after assessment. Simulated
DEB/RPM queries, error/cancellation cases and unchanged-evidence checks passed
twice on Linux WSL, alongside the root intake/journal tests. Portable package
regressions and Windows vet/staticcheck passed. Native installer qualification
and actual service reconciliation are separate gates.

#### Explicit service confirmation and retained native evidence (unreleased)

Implementation: [source commit be65d30](https://github.com/Printmaster-Org/printmaster/commit/be65d30b3e72c43db218d014d1f1e41eb6c9289a).

`ReconcilePrivilegedRepositoryPackage` now takes an explicit run identifier and
holds the root intake lock throughout confirmation. Only an `awaiting-startup`
run is eligible. It checks the native installed target version, queries the
fixed `printmaster-agent.service` through fixed `/usr/bin/systemctl`, and
requires a loaded, active/running unit with no pending daemon reload, a valid
MainPID and nonzero systemd invocation identifier. Kernel `/proc/<pid>/exe`
identity must match the protected ordinary `/usr/bin/printmaster-agent` file.
Repeated service, process and package observations reject changed invocations,
replaced/old executables and concurrently changed package versions.

Confirmation persists `startup-confirmed` with the PID/invocation evidence,
then saves an exact root-private `transactions/<run-id>.json` archive before
retiring the active blocker. Files and both affected directories are synced.
An interrupted archive can be explicitly resumed using the same run identifier
without reinstalling or rewriting conflicting evidence. Archive failures retain
the active record until durable evidence is present; a conflicting archive
fails closed. This is point-in-time systemd/process confirmation, **not**
application readiness, printer/Server connectivity or future service health.

`installing` and `recovery-required` runs cannot be promoted by this success
path, even if the native database currently reports the candidate version.
There is no failure reset, implicit rollback, service restart, CLI/sudo/API
wiring or production trust activation. Linux WSL tests passed twice for native
and systemd command simulations, changed identities, cancellation, archive
failure/conflict/resume, and an actual disposable child process's procfs
executable identity. No installed Agent/service or native package transaction
was modified.
The full unprivileged Linux updater suite also passed in WSL; Windows updater
tests and vet/staticcheck passed. Linux vet passed. The following lint slice
then resolved the two previously recorded Unix Windows-helper warnings.

#### Linux qualification and lint follow-up (unreleased)

Implementation: [source commit 5235994](https://github.com/Printmaster-Org/printmaster/commit/5235994ef6d6e31a477cce01eb62dcec0d09d4f9).

The Windows-helper dispatch now selects the configured test launcher or native
launcher once and handles its error through one path. Unsupported Unix helper
launches still fail explicitly; the stub uses standard lowercase error text.
This removes `SA4023`/`ST1005` without lint suppression, allowing the Linux
updater lint gate to proceed toward the root test step.

Final batch validation passed the complete Windows updater suite, the complete
unprivileged Linux updater suite in Ubuntu WSL, and two runs of the Linux root
intake/journal/recovery/startup selection. Vet and staticcheck are now clean for
the updater package on both Windows and Linux. Linux tests used disposable
state and process fixtures; they did not install packages or touch the running
Agent. Hosted CI itself has not been pushed/run by this local batch, and
real DEB/RPM/service transaction qualification remains open.

#### Root-owned administrative package policy (unreleased)

Implementation: [source commit 59f8086](https://github.com/Printmaster-Org/printmaster/commit/59f8086ab8022e57e86d8335b30139be64dd134c).

`InstallPrivilegedRepositoryPackageFromPolicyFile` now supplies a concrete
policy reader to the staged native installer. Trusted helper configuration
supplies the policy pathname; it is never part of the service user's request.
The policy is reread at the final application-policy check, not cached from
discovery. This is an additional **local administrative ceiling**, not a
replacement for the Agent's fleet policy/scheduling or publisher authentication.

The clean absolute path must have protected root-owned ancestors, and the
opened file must be root-owned, ordinary, single-link, non-executable and not
group/other writable. Descriptor-bound checks and no-follow/nonblocking open
reject symlinks and FIFOs without hanging. Read-only public `0644` policy files
are allowed; secret values do not belong here. Files are limited to 4096 bytes.
Missing, disabled, malformed, unknown/duplicate/null-valued fields and
unsupported schema/pins fail closed. No file is created or permissions repaired.

The flat JSON schema is:

```json
{
  "schema": 1,
  "enabled": false,
  "version_pin_strategy": "major",
  "allow_major_upgrade": false,
  "target_version": "",
  "emergency_abort": false
}
```

This disabled example is documentation only; no policy is provisioned by the
code. Installation requires explicit `enabled: true`; emergency abort rejects
all candidates. Pin semantics reuse the existing application-policy logic.
A nonempty target must be canonical Stable `X.Y.Z`. No root, URL, state path,
command or scheduling controls may be supplied through this schema.

Root policy file/decoder tests passed twice in Linux WSL, including unsafe
ownership/permissions, links, FIFOs, missing/oversized input and administrative
disable rereads. The full unprivileged Linux updater suite, Windows package
regressions and updater vet/staticcheck on both platforms passed.
There is still no helper CLI, sudo permission or automatic-update activation.

#### Restricted native helper input stream (unreleased)

Implementation: [source commit e21cfe2](https://github.com/Printmaster-Org/printmaster/commit/e21cfe29cab24e7851364319199708c7a826e3cb).

`ServePrivilegedRepositoryPackage` now connects a single pipe request to the
independent root verifier, root-owned policy and journaled native consumer.
This remains an in-process helper API: no executable entrypoint, sudo permission,
Agent sender or process supervision is enabled. Trust root, metadata URL, state
directory and policy path are trusted helper configuration, never wire fields.

The pipe frame is a four-byte big-endian JSON-header length (1–4096), canonical
JSON `{"schema":1,"target":{...}}` using the exact TUF target fields, followed by
exactly the declared package bytes (maximum 512 MiB). Canonical decoding rejects
unknown/duplicate/null identity fields and invalid target/schema values. There
are no request commands, filesystem paths, policy, roots or URLs. One helper
invocation handles only one frame; suffix bytes are not interpreted as a second
request. The helper owns/closes the pipe on success or failure.

Root ownership/state locking and administrative enablement are checked before
accepting package data. Receipt has a two-minute total deadline and parent
cancellation interrupts blocked pipe reads. The receipt deadline ends before
publisher verification/native installation, which retain their own bounds.
Pipe input is spooled to a private root-state file, then independently copied/
authenticated through the existing protected snapshot boundary. Truncated or
cancelled input never reaches the consumer; temporary input/snapshots are removed
and cleanup failures remain visible.

Linux WSL tests exercise actual pipes, stalled writers, cancellation, truncated/
oversized frames, forbidden fields, private spool cleanup, and real disposable
TUF verification of authorized/substituted stream bytes. Configured-handler
negative tests reject missing/disabled policy and unprovisioned trust without
creating transaction intent. This is not a native package transaction or
privileged subprocess qualification.

#### Bounded Agent-side native request writer (unreleased)

Implementation: [source commit ab8182b](https://github.com/Printmaster-Org/printmaster/commit/ab8182bb535c784dbecaae0bc980f42b703a8db9).

`WriteRepositoryPackageRequest` now writes the canonical single-frame protocol
to an owned pipe, closing it on every outcome. It checks the open source's exact
length/hash before sending, preserves its offset and hashes transmitted bytes
again to detect mutation during transmission. A two-minute total send deadline
and parent cancellation interrupt blocked writes. Source files remain owned by
the caller. Sending never grants authority; the independent root verifier still
authenticates received bytes. Linux pipe tests cover exact frame shape, invalid
sources, blocked/closed readers, cancellation and offset/handle ownership.
The writer is not yet called by the Agent update Manager.

#### Bounded native helper outcome replies (unreleased)

Implementation: [source commit 095a65e](https://github.com/Printmaster-Org/printmaster/commit/095a65eb1500635f64e86dfc09b3abff085cbae6).

`ServePrivilegedRepositoryPackageResponse` now emits one bounded canonical
length-prefixed JSON outcome over an owned response pipe. Replies contain only
schema, status, optional exact target and root-generated run identifier, never
native command output, policy or local paths. Allowed statuses are `rejected`,
`inspection-required` and `awaiting-startup`; there is no transport success/
startup-confirmed status. Failure after entering the native consumer or after
native completion/cleanup is conservatively `inspection-required`.

`ReadRepositoryPackageOutcome` checks strict canonical fields, schema, status
and run shape, and matches any returned target against the exact request.
Actionable replies require target identity; awaiting-startup also requires the
run identifier. Early rejection may have no identity because configuration or
input parsing failed first. Invalid/partial replies return no actionable data.
Reads are bounded to fifteen minutes (or the earlier parent deadline); a
separate five-second reply budget allows a cancelled helper to report failure
without waiting indefinitely for a reader. Missing replies remain ambiguous
and must not cause blind installation retry. Protected journals remain the
durable authority; transport replies do not clear blockers or authorize repair.

Linux pipe tests cover valid/invalid/wrong-target outcomes, truncated/oversized
frames, blocked reads, owned-handle cleanup and rejection after cancellation.
The outcome wrapper is not yet connected to an installed helper process or the
Manager's progress reporting.

#### Duplex exchange and real subprocess rehearsal (unreleased)

Implementation: [source commit 2d31474](https://github.com/Printmaster-Org/printmaster/commit/2d31474f099101ee9e58f839a0c7c1f55e3eb649).

`ExchangeRepositoryPackage` now sends the package and reads the outcome
concurrently. A failed send cancels a blocked reply read; a rejected/invalid
reply cancels a blocked sender, so early helper rejection cannot deadlock behind
pipe capacity. Both directions are joined before return and owned handles are
closed. Partial exchanges fail as inspection-required rather than implying a
safe retry. Valid negative outcomes also return an error. The caller still owns
and must supervise/wait the trusted helper process; a valid awaiting-startup
reply alone does not establish a successful process exit.

Real Linux child-process tests exposed inherited blocking stdin/stdout handles
that Go had not registered for deadline polling. The transport now duplicates
owned FIFO descriptors with close-on-exec and nonblocking setup before
registering them with Go's poller. Deadline cancellation therefore works for
real inherited pipes, not only `os.Pipe` fixtures; no pathname is opened.

The rehearsal runs the test executable as a disposable helper with real framed
pipe I/O, independent disposable-key TUF verification, root-owned administrative
policy and durable journal writes. Only native package commands are simulated.
It covers completed native consumption, installer failure, disabled policy,
untrusted root, early exit, malformed reply, a stalled child and nonzero exit
after a valid reply. Parent checks both exchange and exit independently, and
checks saved target/run/phases and temporary-input cleanup. A send-side source
failure also proves prompt cancellation of the reply reader.

This is helper transport qualification, not a native DEB/RPM transaction,
service qualification or a production helper entrypoint. No sudo, CLI, installed
Agent/service changes or unattended activation are added.
Final validation passed three runs of the Linux root package selection, the
full unprivileged Linux and Windows updater suites, and updater vet/staticcheck
on both platforms. Docs tests, Hugo and generated link/anchor checks passed.

#### Fixed native helper executable (unreleased, staged)

Implementation: [source commit 4a638ea](https://github.com/Printmaster-Org/printmaster/commit/4a638ea).

The Linux-only `agent/cmd/printmaster-agent-update` executable now calls the
production root intake, file policy and response handler with a fifteen-minute
independent budget. It accepts **no arguments** and reads no environment-based
configuration. Its intended installed path is
`/usr/libexec/printmaster-agent-update`. The original entrypoint slice did not
package it; the systemd packaging slice below now does, without sudo permission.
Missing configuration fails closed before package modification.

Fixed root-controlled files are `/etc/printmaster/update-helper.json` (schema
`1` and `metadata_url` only), `/etc/printmaster/update-publisher-root.json`
(independently provisioned public TUF root), and
`/etc/printmaster/update-policy.json` (administrative policy above).
The root state path is fixed at `/var/lib/printmaster-update`.
Configuration uses the same protected descriptor reader as policy, with a
4096-byte config limit and 1 MiB public-root limit. The metadata URL must be HTTPS
without credentials, query or fragment. Duplicate/unknown/case-alias fields
are rejected. No Server response, request field, flag or environment value may
provision initial publisher authority. These files are not created by the helper.

This is a buildable executable, not activated package integration. Initial root
provisioning remains an explicit owner operation; do not copy disposable test
roots into production. Native scripts may terminate the helper despite its
independent context, so journal/recovery limitations remain unchanged.

#### Supervised fixed helper launch (unreleased, root callers only)

Implementation: [source commit 2f4ce1f](https://github.com/Printmaster-Org/printmaster/commit/2f4ce1f).

`LaunchRepositoryPackage` validates the fixed helper's root-owned ordinary
executable and protected ancestors, starts it with no arguments, a fixed `/`
working directory and minimal native-command environment, then joins duplex
exchange **and process exit**. Nonzero exit after a valid awaiting-startup reply
is an error, not update success. Diagnostics are bounded. Start failure closes
all pipe handles; every started child is waited/reaped.

Caller cancellation stops the exchange but does not kill an in-flight native
installer. The call continues waiting under an independent sixteen-minute outer
budget, after the helper's own fifteen-minute budget. Outer timeout may terminate
the helper and is always ambiguous: inspect protected state, do not retry.
This is not a guarantee that every descendant has stopped or that the package
database is repaired. No service-user sudo delegation is enabled; nonroot launch
fails explicitly. Subprocess tests cover early rejection, stalls, nonzero exit
after reply, launch failure and survival of caller cancellation.

#### Real isolated Debian transaction qualification (unreleased)

The opt-in root test `TestPrivilegedRepositoryPackageIsolatedDebian` now builds
script-free DEB fixtures and uses **real** `dpkg-deb`, `dpkg` and `dpkg-query`
through the independently authenticated subprocess exchange. Test-only command
redirection pins `--root`, `--admindir` and the dpkg log to a temporary filesystem;
the host package database, installed Agent and services are not modified.
No fixture root, command or override is accepted by the production helper.

The `1.0.0` → `1.1.0` success case checks installed payload/database, exact
target/run and `awaiting-startup` journal. An intentionally missing dependency
produces a real nonzero installer exit, leaves the candidate **unpacked, not
configured**, and records `recovery-required`. The shared installed-identity
parser rejects that incomplete state. Both cases attempt a second handoff and
verify the active journal blocks replay without changing evidence or leaking
temporary package spools. These tests passed three times under existing Ubuntu
WSL. CI explicitly opts in after its ordinary root tests; remote CI execution
has not been observed for these unpushed changes.

To reproduce on a disposable Linux checkout with existing dpkg tools:

```sh
cd agent
go test -c -o /tmp/printmaster-package-intake.test ./autoupdate
sudo env PRINTMASTER_TEST_ISOLATED_DEB=1 /tmp/printmaster-package-intake.test \
  -test.v -test.timeout=3m \
  '-test.run=^TestPrivilegedRepositoryPackageIsolatedDebian$'
rm /tmp/printmaster-package-intake.test
```

This closes **isolated Debian byte-to-database and dependency-failure testing**,
not real installed service qualification: fixtures contain no maintainer scripts
or systemd units. RPM transactions, service restart/readiness and production
authority remain open; helper packaging is now covered separately below.

#### In-lifetime repository acquisition handoff (unreleased, staged)

Repository acquisition now has a synchronous `withRepositoryPackage` consumer:
it keeps the exact authenticated private snapshot open until the handoff
returns, then closes and removes both snapshot and acquisition workspace.
No deleted pathname or service-user receipt is passed as installation authority.
Consumer errors, cancellation and cleanup errors return no acquisition
authorization. An error can still follow completed native modification:
inspect the root journal rather than retrying. The existing acquire-only caller retains its blocked-installation
behavior; this does **not** activate the Manager or grant sudo permission.

The real isolated DEB rehearsal now starts with this acquisition lifetime,
authenticates independently on both service and root sides, exchanges bytes with
the supervised subprocess, then verifies native database/journal outcomes and
cleanup. Only repository download is simulated with fixture bytes; native
inspection and installation are real. Success and actual dependency failure
passed three repeated runs, including replay blocking. Separate cross-platform
tests cover consumer failure/cancellation, unauthenticated bytes, missing
consumer, closed descriptors and deleted workspaces.

#### Independent systemd package boundary (unreleased, not activated)

Implementation: [source commit 6ba9894](https://github.com/Printmaster-Org/printmaster/commit/6ba98949fac594585dd3ca8c1b9d3ba6841cf061).

The owner-selected Linux privilege boundary is a separate root systemd
socket/service, not a service-user sudo command. DEB and RPM packages now include
the fixed `/usr/libexec/printmaster-agent-update` executable,
`printmaster-agent-update.socket` and `printmaster-agent-update@.service`.
Release CI builds the helper for each Linux Agent architecture before DEB
packaging and transfers a separately named, architecture-matched helper artifact
to RPM packaging. Both builders reject a missing helper.

Packages replace `/etc/sudoers.d/printmaster-agent` with a comment-only managed
file (root-owned, mode `0440`), removing the historical direct package-manager
and service-control grants. The RPM file deliberately no longer uses
`%config(noreplace)`: old grants must not remain active after upgrade. This does
not remove grants an administrator placed in other sudoers files. Existing
Agents relying on those old grants lose that update path; use owner-managed
installation during the hardened updater migration.

The socket listens at `/run/printmaster-agent-update.sock` as root, group
`printmaster`, mode `0660`, with one accepted connection at a time.
It requires all three independent root configuration/trust/policy files to exist.
Existence is only an activation condition: the helper still validates protected
ownership, modes, content, TUF authorization and policy independently.
The template service runs the fixed executable as root with **no arguments**
and the accepted Unix stream on stdin/stdout; diagnostics go to the journal.
It has no dependency on the Agent service's lifetime. The helper keeps its
fifteen-minute budget and the unit has a sixteen-minute outer limit.
`KillMode=process` avoids killing a native installer descendant merely because
the helper's outer limit expired; such a timeout is ambiguous, not a safe retry
or proof that package modification stopped.

`SubmitRepositoryPackage` is a staged sender, not a Manager activation:
it checks the root-owned protected socket and kernel peer UID before sending
the existing bounded package frame. Only Unix **stream** sockets and pipes are
accepted; regular files, TCP and datagram sockets are rejected. Descriptor
duplication preserves cancellation/deadline support for inherited systemd
streams. Caller cancellation closes that caller's connection, not the
independently supervised root transaction. An `awaiting-startup` response is
neither helper-process success nor service-startup confirmation.

**Activation stays off.** Packages do not enable/start the socket or supply
helper configuration, administrative policy or an initial publisher root.
Removal stops/disables the socket; upgrades do not intentionally stop an
in-flight helper instance. At the foundation revision, the Manager still explicitly refused installation
after authenticated package acquisition; the durable integration below supersedes
that staging block only for independently provisioned hosts. Do not manually activate this staged
boundary as a substitute for completing lifecycle and recovery integration.

Local qualification covers real multi-megabyte Unix streams, root/nonroot peer
checks, source-offset preservation, early rejection, cancellation, stalled peers,
wrong-target and malformed replies. An inherited-socket subprocess uses real
disposable TUF metadata, root policy and durable journals; only native package
commands are mocked. Repeated testing exposed a descriptor race: Go's `File.Fd`
could switch a shared duplex socket back to blocking mode and defeat
cancellation. Duplication now uses `RawConn.Control`, preserving nonblocking
mode; fifty consecutive socket-selection runs passed after that fix.
Real DEB build/extraction checks the exact helper bytes,
root ownership, modes and units without installing anything. Systemd syntax was
checked on temporary unit copies with only the executable path substituted for
an existing test executable. This is **not** installed socket activation or
service lifecycle evidence. RPM build, replacement of an installed historical
sudoers file and actual DEB/RPM service upgrades remain unqualified here.

**At the foundation revision, remaining implementation included** the Manager
sender, service restart/readiness, Agent outcome reporting and explicit
failed-transaction recovery. The following slices implement those surfaces;
native qualification results below determine whether this gate can close.
The current package service runs as `printmaster`, not root; an authorization
receipt supplied by that user must not become arbitrary root install authority.
The shared file check is a prerequisite, not a privileged installer: callers
must prevent modification until consumption, and may not verify one file then
install another by version or mutable pathname. Native package identity
checks and no-downgrade/pin enforcement now exist in the staged consumer.
Dependency/recovery behavior, startup validation and Linux
runtime qualification remain part of that follow-up.

#### Native systemd lifecycle qualification (unreleased, qualified scope)

The installed Linux helper now owns the post-install service restart as well
as native consumption. After an independently authorized installer completes
and the installed package version matches, it restarts only
`printmaster-agent.service`, then polls under a one-minute bound for the existing
root package/systemd/procfs reconciliation checks. Only a durable
`startup-confirmed` archive permits that response. Restart/readiness failure
records `recovery-required` and retains the blocker; neither installer failure
nor service failure triggers an automatic package downgrade or journal reset.
The root helper's independent lifetime does not depend on the Agent's connection.

The manual **Linux package lifecycle qualification** GitHub Actions workflow
uses a disposable Ubuntu hosted runner for DEB and a disposable Fedora/systemd
container on a hosted runner for RPM. The test opt-in requires
`PRINTMASTER_LIVE_LINUX_PACKAGES=disposable-github-runner`, root and explicit
GitHub-hosted environment markers. Ordinary shared test/build/release runners
strip the live opt-in. Do not reproduce it on a workstation or persistent host:
it intentionally installs packages and changes production-named services.

Fixtures build the real Agent/helper and package scripts, provision only
disposable root authority and an HTTPS metadata fixture, and activate the
installed socket. Scenarios cover upgrade, disconnection during an observed
native transaction, an invalid service executable, and an actual missing native
dependency. They inspect the real root archive/blocker and reject replay after
failure. Requests originate from the actual Manager in a separate process
running as the installed `printmaster` service identity. Native package
discovery/metadata inspection, both publisher authorizations, durable local
pending state, socket admission and root installation are real. Only repository
downloading is replaced with the exact fixture package bytes. The disconnected
case kills that unprivileged sender after observing native `installing`; it does
not stop the independent systemd helper. The old Manager must never report
replacement startup success, and pending state must survive every scenario.
Root public observations must match the durable transaction and exact target.
Between scenarios, fixture-only owner repair reinstalls the baseline
and moves preserved transaction evidence; this is not a production reset API.
Workflow evidence includes the root transaction data and system journals.

**Qualified on 2026-10-21:**
[native CI run 39652871637](https://github.com/Printmaster-Org/printmaster/actions/runs/39652871637)
passed both jobs at
[source 42c6da3](https://github.com/Printmaster-Org/printmaster/commit/42c6da3ec9fa5c9158c3fa36796851425e49ebf5).
All eight actual native scenarios passed, and both transaction/journal evidence
artifacts uploaded successfully:

| Scenario | Ubuntu DEB | Fedora RPM | Observed durable outcome |
| --- | --- | --- | --- |
| Upgrade through unprivileged Manager | Passed | Passed | `startup-confirmed` |
| Sender killed during native `installing` | Passed | Passed | Independent helper archived `startup-confirmed` |
| Invalid service executable | Passed | Passed | `recovery-required`, then explicit owner repair archived `owner-repaired` |
| Actual missing native dependency | Passed | Passed | `recovery-required`, replay blocked, then explicit owner repair archived `owner-repaired` |

Both formats also revoked the owner-modified historical managed sudo grant,
including RPM's former `%config(noreplace)` case. Exact local pending state and
matching public root observations were checked. Earlier attempts exposed
fixture evidence permissions/cross-filesystem moves, rapid-scenario start-rate
state and sender staging on a no-exec temporary mount; those fixture issues
were corrected without weakening production unit limits, container mounts or
test assertions. This closes the Linux native lifecycle gate within this
documented scope. Production socket/trust activation remains off.

This is not an enrolled Agent-to-Server rehearsal, production trust ceremony or
all-distributions/architectures qualification. The running packaged Agent
service is real; its replacement Manager's PID-bound startup reconciliation is
separately regression-tested rather than driven through an enrolled Server.

#### Durable native Manager reporting and owner repair (unreleased)

The implementation is recorded in
[source d7b0fb6](https://github.com/Printmaster-Org/printmaster/commit/d7b0fb6c689fbb2e5f8526d538bda59c903301bf);
the unprivileged native Manager rehearsal and independent fixture start-limit
handling are in
[source f16e634](https://github.com/Printmaster-Org/printmaster/commit/f16e6342fad1cbf673770a9a070c3517136be152).
The Fedora container's no-exec temporary mount remains intact; its root-owned
sender fixture is staged outside that mount in
[source 42c6da3](https://github.com/Printmaster-Org/printmaster/commit/42c6da3ec9fa5c9158c3fa36796851425e49ebf5).

The Manager now uses the authenticated snapshot's in-lifetime consumer to send
exact package bytes to the independently provisioned systemd helper. Before
submission it persists the local operation, previous version, exact package
target and start time. Acquisition failure creates no pending install. Any
failed or disconnected submission after pending persistence retains the local
blocker: absence of a reply is not proof that installation did not begin.
The old Agent never marks itself successfully updated or invokes sudo/restart.

The root helper atomically publishes non-secret observations at
`/var/lib/printmaster-update-results/current.json` (root-owned `0644`, protected
root-owned `0755` directory) while retaining private authority/journals under
`/var/lib/printmaster-update`. These observations are not install/retry
authorization. Descriptor-bound reads reject links, hardlinks, unsafe
ownership/modes and noncanonical/oversized evidence. The replacement Manager
requires an exact package/previous-version match, an observation no older than
its pending start, `startup-confirmed`, its own running version and its own PID
matching the root-confirmed service PID. A version string alone cannot finish
the update. Missing/in-progress evidence is polled for at most sixteen minutes;
failure, timeout or mismatch stays visible and retains the local blocker.
Startup logging distinguishes pending reconciliation from actual success.

The separate root-only `/usr/libexec/printmaster-agent-update-recovery`
administrator command is packaged alongside the no-argument socket helper.
It has **no** service-user sudo grant and accepts only:

```sh
sudo /usr/libexec/printmaster-agent-update-recovery inspect
sudo /usr/libexec/printmaster-agent-update-recovery confirm-repair ROOT_RUN_ID
```

`inspect` reads the active protected run and queries native installed state;
an incomplete/unconfigured package produces an explicit inspection error rather
than a healthy-looking result. Read the protected `native-transaction.json`
and native package-manager diagnostics when the database itself is incomplete.
Preserve the journal and logs before taking owner action.

`confirm-repair` does **not** install/downgrade packages, restart services or
ignore dependencies. The owner must first resolve package-database/dependency
problems using normal administrative tooling, restore either the recorded
previous or exact candidate version, and start the canonical Agent service.
Confirmation requires the exact failed root run, `recovery-required`, a fully
configured known version, stable systemd invocation and the protected installed
executable. It refuses `installing`/ambiguous runs, unrelated versions and
unstable/wrong processes. It durably archives `owner-repaired` evidence before
retiring the blocker; crashes during archival can resume the same confirmation.
The matching replacement Manager records the original update as **failed,
owner repaired**, then releases its local pending blocker. It never converts
repair into original update success. If the service was restarted after repair
confirmation, its PID no longer matches; retain evidence and investigate rather
than deleting pending state to bypass validation.

For an `installing` run left by helper/host interruption, do not use this command
as a reset: first establish whether any native transaction remains active.
That ambiguous case intentionally requires further owner investigation, not an
automatic replay, descendant kill, rollback or journal deletion.

The development Windows machine intentionally retains owner-approved
`RemoteSigned`; reverting its policy is not a pending user action. This
does not alter supported signing-policy checks on other installations.

Validation: real disposable-key TUF package-file tests passed, including
short/oversized/substituted bytes, binary/package identity separation, wrong
version/architecture/format, invalid files, cancellation and offset preservation.
The focused suite also passed two repeated runs. Shared/updater vet and
staticcheck, the full updater suite, documentation tests and Hugo/link checks
passed. An initial concurrent validation run hit the existing detached-helper
smoke test's marker deadline; a subsequent full updater rerun passed.
Its timing sensitivity remains a test-reliability follow-up, not evidence of
a successful or failed real Linux installation.

### Application policy and installation descriptors (unreleased)

Implementation:
[3b76a8f](https://github.com/Printmaster-Org/printmaster/commit/3b76a8fd6a4b22d87b99c9c8d3bd26a21218a22a).

The Agent freezes its effective channel for each operation and sends
`explicit_channel: true` on every manifest lookup. Managed changes take effect
on the next operation, not during download/apply. MSI/package installs retain
their Stable-only restriction.

Scheduled/manual checks, Force, explicit channel installs, retries and final
apply share one application policy. Force bypasses maintenance timing, not
version pins, major-upgrade restrictions, channel constraints or publisher
trust. An invalid installed/candidate version or pin fails explicitly with
`APPLICATION_POLICY`; there is no unequal-string installation fallback.
Existing supported SemVer/legacy four-part versions remain understood, as do
numeric Git hashes with leading zeros in Dev build identities.
Scheduled pin exclusions and equal-version checks remain no-op.
Manual equal-version reinstalls must match the installed raw-binary length/hash,
or the exact recorded authenticated MSI identity. An older MSI installation
without that receipt needs an owner-managed reinstall instead.

Lower application versions are rejected even for Force and a Beta/Dev-to-Stable
switch. Wait for a sufficiently new Stable release or perform an owner-managed
installation; choosing a channel is not downgrade approval. Same-line Dev hashes
have no chronological order. The publisher assigns immutable positive
`custom.printmaster_release_sequence` values to new TUF targets within each
component/channel/OS/architecture/format stream. The Agent authenticates both
the installed Dev artifact and candidate, then requires a strictly greater
sequence. Re-publishing an old target or refreshing metadata never promotes it.
Legacy targets without sequences are retained unchanged; an unorderable Dev
baseline fails closed with migration guidance, not a Server-time/hash fallback.
Keep the installed Dev target in publisher inventory.

The in-memory installation descriptor binds run/from-version, exact TUF target
and sequence, staged/destination/backup paths, and the previous artifact's
length/hash. Publisher authorization, application policy, staged bytes, unchanged
installed bytes and backup are checked again at apply. A missing/invalid backup
blocks handoff. The pending journal retains the descriptor; successful binary
startup validation checks installed bytes before persisting an installation
receipt. Windows binary/MSI helpers recheck the embedded expected length/hash
before copy/installer invocation, without trusting a replaceable manifest path.

**Recovery exception:** synchronous failed-apply recovery may restore only the
recorded backup for that failed run, after checking its exact previous
length/hash. A substituted backup or another run is rejected. This preserves
rollback to the previous version without permitting arbitrary signed-version
downgrades. It does **not** add automatic health-gated rollback, MSI downgrade
transactions, an independent watchdog or durable detached-helper recovery.

Tests cover entrypoint/pin/downgrade negatives, real TUF Dev ordering in both
lexical hash directions, retained ordering through refresh/client restart,
descriptor/backup substitution, final-policy tightening, journal receipts and
actual Windows PowerShell integrity execution. Whole-installation OS/service
qualification remains separate.

Local validation passed the full shared/Common and Agent Go suites, shared/
Agent static analysis, real Server/TUF metadata integration, repeated focused
policy/sequence tests, 25 focused JavaScript tests and the documentation
tests/build/link checks. Linux updater tests cross-compile but were not executed
on Linux in this session. Race-detector execution was unavailable because this
Windows environment has CGO disabled and no C compiler; no race-test pass is
claimed. Real installer/service and cross-platform qualification remain in the
listed gates.

### Bounded Windows installer handoffs (unreleased)

Implementation:
[Agent source commit](https://github.com/Printmaster-Org/printmaster/commit/16ba18e88bac81df1f10eec50616ddbd1f4d8d18).

The Agent launches a detached PowerShell helper for Windows raw-binary and MSI
updates, then exits so the helper can wait for the old Agent process to end.
The helper bounds both that wait and service stop/start waits to two minutes.
It records atomic, run- and target-bound `running`, `succeeded`, `failed` or
`timed_out` results. Startup reconciles a still-running helper asynchronously;
an unresolved or timed-out handoff is not silently cleared or replaced by a new
update.

Raw binaries are rechecked against the authorized length and SHA-256, copied
beside the destination, rechecked, then installed with an atomic file replace.
If service startup fails, the helper attempts to restore the exact verified
previous binary and restart the previously running service. These attempts are
recorded as helper failures if recovery cannot be completed; this is not a
power-loss-safe transaction or an independent recovery service.

MSI execution is bounded to 30 minutes. On timeout the helper records
`MSI_TIMEOUT` and deliberately does not kill `msiexec`, because interrupting a
Windows Installer transaction may leave package state damaged. The Agent keeps
the pending handoff for operator review and blocks another automatic update.
Successful process exit is checked at startup against the expected Agent
version; MSI-managed package repair or rollback is not claimed.

Generated-script requirements, Windows PowerShell parsing, durable-result
matching and deferred startup reconciliation have regression coverage. These
tests do not qualify real MSI transactions, service recovery, power-loss
behavior, or every supported installer-created ACL. Those platform gates
remain open.

The [execution follow-up](https://github.com/Printmaster-Org/printmaster/commit/da1460783111474a2707f10e8fd5da178a6d49a9)
covers actual PowerShell hashing, atomic replacement,
durable JSON writes and verified predecessor restoration with simulated
service/process control. It exposed and fixes PowerShell's conversion of `$null`
to an empty backup-path string (`[NullString]::Value` is required), and ensures
a service that has stopped after the parent exits is still restarted.
ServiceController start/stop requests use bounded status waits rather than
blocking service cmdlets. These tests run with PowerShell 7 where available;
the production launcher still uses Windows PowerShell 5.1.

The launcher checks its effective execution policy before launching unsigned
helpers. An enforced `AllSigned` or `Restricted` policy rejects the handoff
explicitly without exiting the Agent or changing machine policy; the rejected
pending handoff is removed so an owner-managed repair can be retried.
`-ExecutionPolicy Bypass` cannot override Group Policy. Automatic signing and
switching the production host to PowerShell 7 are not implemented.

Owner-observed Windows 11 migration smoke test (2026-10-19): an existing
LocalSystem raw-binary service migrated from the legacy ProgramData executable
to the protected Program Files copy. Source/installed SHA-256 values matched;
directory and executable ACLs granted only SYSTEM and Administrators. The
service resumed uploads, settings/devices were retained, and the Server
recognized the same Agent identity. This used an unversioned development build;
it qualifies this manual migration smoke case, not version ordering, automatic
helper installation, MSI, or every supported 0.31.x baseline. The verified
stopped-service backup was retained. Publisher trust remains unprovisioned.

#### Opt-in live Windows raw-binary rehearsal

Implementation: [Agent source commit](https://github.com/Printmaster-Org/printmaster/commit/45971ec98c60684c03e08fc363cc6dea50d64a65).

`agent/autoupdate/windows_live_test.go` provides an explicitly gated, destructive
rehearsal for the owner's Windows test Agent, not a default CI test. The owner
reported installing the versioned `0.32.0.2-dev` baseline and a running service
on 2026-10-20. A narrowly scoped owner-managed policy exception now permits
local scripts (`RemoteSigned`); restore the original `AllSigned` policy after
the test window. No automated policy changes are made.

The live test requires Administrator access, a stopped `PrintMasterAgent`
LocalSystem service registered at the protected path, the exact approved
baseline SHA-256, no pending handoff, and an independently checked candidate
hash. It advances only this fixture's `0.32.0.2-dev` to `0.32.0.3-dev`.
An existing stopped-service backup must be retained before opting in.

The child process constructs real TUF metadata using disposable in-memory
private keys and authorizes both the installed Dev baseline and the candidate
with signed release ordering. It calls the production update manager, whose
normal Windows PowerShell 5.1 helper waits for that child to exit. The helper
then replaces the binary and starts the actual service. A supervisor verifies
the run-bound helper result, running service, installed bytes, startup progress
success and removal of pending state. Failure leaves evidence for operator
review; it does not blindly kill the helper or overwrite live data.

Build the Go test executable with `go test -c` in the Agent module. The live
test skips unless `PRINTMASTER_LIVE_WINDOWS_UPDATE` is exactly
`replace-test-agent-with-backup`. Supply the separately built candidate path
and hash using `PRINTMASTER_LIVE_WINDOWS_CANDIDATE` and
`PRINTMASTER_LIVE_WINDOWS_CANDIDATE_SHA256`, then invoke only
`-test.run=^TestLiveWindowsBinaryUpdate$`. Clear those environment variables
afterward. Do not run the whole compiled test suite elevated with the opt-in set.

**Live raw-binary handoff qualified on the owner's Windows test Agent on
2026-10-20.** This uses an injected fixture artifact/
manifest client and a real loopback TUF verifier, not the fleet Server's
transport or embedded-root provisioning. Neither test keys nor a test root
are installed in the Agent; normal unattended updates remain blocked by its
unprovisioned root after restart. The passing rehearsal qualifies this real manager/
helper/service/startup handoff, not the full Server-triggered delivery path,
MSI, failure injection on a real service, or production activation.

The first owner-run attempt on 2026-10-20 was rejected before helper launch:
Windows PowerShell 5.1 inherited PowerShell 7 module search paths through the
native test runner and could not load `Microsoft.PowerShell.Security`.
The pending handoff was cleared, no helper outcome was created, and the
owner-stopped service remained stopped. The launcher now resolves the system
Windows PowerShell executable and seeds only its child-process module path
with that installation's built-in modules, for both policy inspection and
detached helper execution. Machine policy is still honored; no machine/user
environment or policy is changed. Regression coverage exercises command and
script-file execution with an incompatible inherited security module.
This fixed the first observed launch blocker; the next attempt exposed the
separate process-creation issue below.

Launch correction: [Agent source commit](https://github.com/Printmaster-Org/printmaster/commit/e16a1682d0b25617c584c84f7c1802f263f51c25).

The second owner-run attempt passed policy inspection but timed out while
awaiting helper completion. Inspection found a stopped service, no remaining
helper process, no helper outcome, and a retained pending handoff. A harmless
temporary-script reproduction showed Windows PowerShell exiting before script
execution with `DETACHED_PROCESS`. The launcher now uses `CREATE_NO_WINDOW`
with a separate process group instead. A native child-process regression
requires the helper to write its marker only after its launching parent exits,
covering both script execution and independent lifetime. Recovery must retain
the failed run's pending/progress evidence and verify the unchanged baseline
and absent helper before explicitly clearing that handoff for another attempt.
The subsequent live rerun passed as recorded below.

Console-free launch correction: [Agent source commit](https://github.com/Printmaster-Org/printmaster/commit/6c8da8ce0d2528ca3aeb286395628cd88097f8c9).

The owner ran the explicit recovery-and-retry script from elevated PowerShell 7.
It archived the unstarted `run-1792500622961` evidence before retrying.
`TestLiveWindowsBinaryUpdate` passed in **15.67 seconds** for
`run-1792501563850`, advancing the exact approved `0.32.0.2-dev` baseline to
`0.32.0.3-dev` built from `6c8da8c`. Its success assertions verified the
run-bound helper success, installed candidate identity, running service,
startup progress success and pending-handoff removal. The installed version
command reported build time `2026-10-20T12:59:01Z`; the owner also confirmed
the Server still recognized the same Agent and supplied a screenshot showing
it active on `0.32.0.3-dev`.

The unelevated assistant independently confirmed the running protected-path
service after this pass, but could no longer read the protected helper/progress
files. Those result assertions are evidenced by the owner's elevated test
output, not a second direct read. No ACL relaxation was attempted. Retain the
backup and failed-run archive; restore the owner-managed `AllSigned` policy
when the approved test window ends. Real-service failure/recovery injection,
MSI, the full Server-triggered transport and production trust activation
remain separate gates.

### Installer permissions and safe-path implementation (unreleased)

Implementation: [permission qualification and installer fixes eac1f11](https://github.com/Printmaster-Org/printmaster/commit/eac1f11fbd289040a567b21d825c535792a5e9bb),
following the [initial safe-path implementation](https://github.com/Printmaster-Org/printmaster/commit/da0f9e2c3714bea251512f3363328f9b8d21d22a).

Updater state creation now fails closed unless it can establish private
permissions before metadata or update artifacts are used. Unix data directories
are restricted to the service identity; updater state rejects symlinks, special
files and multiply linked files. Installation targets must be ordinary files
owned by root or the updater identity, with safe ancestors and no hard links.
Every Unix ancestor must also be owned by root or the updater identity, even
when its current mode is not writable: a foreign owner could grant itself
replacement rights later.
Same-filesystem replacement remains an atomic rename; cross-filesystem copy-over
is now rejected rather than truncating the installed executable.

Windows updater state and publisher metadata receive protected ACLs for the
running identity, SYSTEM and local Administrators; existing updater contents
are resecured and reparse points and multiply linked files are rejected.
Windows raw-service source/installed executables must also have exactly one
hard link before protection is applied. Raw Windows service installs
register a protected copy under `Program Files\PrintMaster\Agent`, with
ProgramData service directories restricted to trusted principals. The manual
PowerShell update script now writes the Agent to that location and elevates
before stopping services. A service still registered from an older writable
location must be reinstalled with `--service update` before automatic updating
is accepted from it.

The unreleased MSI now owns the exact canonical
`Program Files\PrintMaster\Agent\printmaster-agent.exe` rather than placing a
second executable one directory above the service's registered copy. Bootstrap
configuration is adjacent under `Agent\config`. The components whose key-file
paths moved have new component GUIDs. This fixes fresh-install ownership/layout;
it does **not** qualify an existing MSI's major upgrade, repair or service
re-registration.

#### Permission qualification matrix

Local evidence from the 2026-10-20 permission-gate pass:

| Surface | Observed evidence | Status / limit |
| --- | --- | --- |
| Linux private updater/trust trees | Root launches disposable processes as UID/GID 60001 (service) and 60002 (outsider), without creating accounts. The service writes private artifacts and atomically updates its own raw-binary fixture; the outsider cannot read, overwrite, delete or inject private evidence. Both can write their own positive-control directories. | Passed three consecutive root runs under WSL Linux. No installed service modified. |
| Linux root-owned package executable | The unprivileged service can inspect the trusted executable but actual raw replacement returns OS permission denial; both processes leave package bytes unchanged. | Passed. Native package-manager integration remains gate 3. |
| Unix unsafe ownership / links | Reject foreign-owned 0755 ancestors, writable parents/targets, hard links and linked state/trust entries. | Passed on Linux and native hosted macOS, including root-only ownership cases. |
| Cross-filesystem raw replacement | Real `/dev/shm` versus temporary-filesystem rename is rejected; old and candidate bytes remain intact. | Passed on Linux. Copy-over remains unsupported. |
| Windows private state | A real restricted Windows token with BUILTIN Users as its restricting SID is denied read, write, delete, ACL-change and adjacent-file creation; an explicitly Users-writable positive control succeeds. | Passed on Windows without elevation. This is OS access enforcement, not a separate account or a SYSTEM-service installation. |
| Windows aliases / redirection / service copy | Real NTFS hard links are rejected for installed executable, state, trust, service-file protection and a separately launched source executable. A directory junction exercises reparse rejection without requiring symbolic-link privilege. Disposable raw-service copy tests verify the canonical path and protected DACL. | Passed locally and on hosted Windows. |
| MSI ownership/layout and actual permissions | Built the actual Agent MSI with release-workflow WiX 3.11.2 and inspected its compiled File, Component and Directory tables. After explicit owner approval, unregistered the disposable test Agent, archived its executable/data, and installed the MSI with exit 0. A SYSTEM task verified the running canonical SYSTEM service, protected executable and inherited service-created candidate/backup/descriptor/trust fixtures. A restricted Users token could not write/delete/change ACLs/inject files, or read private evidence; its Users-writable positive control passed. | Actual installation and opted-in `TestLiveWindowsInstallerPermissions` passed. A locked old data directory required preserving the remainder by copy, so this was a fresh MSI executable install with retained data directories, not a clean-machine data-volume test. State was initialized by the enrolled service, not repaired by the test. Existing ICE61 same-version-upgrade warning remains; major upgrade/repair/failure recovery are separate gates. |
| Native macOS | Hosted native permission/substitution tests pass. The separate root invocation actually launches UID/GID 60001 and 60002 and passes both positive controls, private-state denial, service-owned atomic replacement and foreign-owner cases. | Passed in [CI run 39481623764](https://github.com/Printmaster-Org/printmaster/actions/runs/39481623764), on test branch `test/installer-permissions-20261020` at `eac1f11`. Root-only cases skip in the ordinary-user invocation and pass in the explicit root step; they are not counted as covered by the skips. No claim of live launchd/service lifecycle qualification. |

**The original gate 1 is closed within this permission/safe-path scope; eight
top-level gates remain.** The original gate 2 still owns MSI/helper transaction
failure/recovery; original gate 3 owns native package/service integration;
original gate 6 owns supported 0.31.x migration. Clean-machine installation,
live launchd service behavior, wider adversarial handoffs and final release
go/no-go remain in platform/release qualification. None is waived by these
tests. The CI Passed aggregate requires the reusable Windows/macOS permission
job, and the Linux root job includes the ownership/identity cases.

The local Windows fixture initially used an unenrolled loopback configuration;
registration failed and the updater correctly did not initialize. Restoring
the protected test backup's original identity, configuration and credential
files allowed service-created updater initialization and the SYSTEM check to
pass. This is not a new onboarding or migration guarantee. The installed test
Agent is left running as SYSTEM at the canonical path. Its protected recovery
backup is `C:\ProgramData\PrintMaster-PermissionQualification-20261020`;
the temporary SYSTEM task was removed. RemoteSigned is unchanged and production
publisher trust/unattended activation remain off.

#### Windows MSI transaction qualification

The unreleased helper now requires the service to reach `Running` after MSI
exit 0 or 3010 before writing a successful helper outcome. MSI custom actions
can ignore a service-start error, so the installer exit alone is insufficient.
The helper preserves 3010 and its reboot-required diagnostic. If service startup
fails, it records a failure without raw-overwriting MSI-owned executable files.
Startup reconciliation must still independently confirm the target version;
a successful helper outcome alone does not complete an update.

`TestWindowsHelperExecutesMSITransaction` executes the generated production
helper under built-in Windows PowerShell 5.1. Service/process operations are
simulated, but artifact verification, file replacement detection and durable
outcome writes are real. It covers success, reboot-required, rejected package,
installer contention, transaction failure, rejection plus failed restart,
post-install startup failure, substituted staging and an active-installer
timeout. Successful simulated installs write distinct candidate executable
bytes, so the startup-failure case detects accidental raw rollback. The timeout
case requires no service restart while the installer remains active. These
tests are included in the shared `native` selection and therefore its required
Windows CI job; configuring that job is not evidence of hosted execution.

On 2026-10-21, the owner-approved disposable MSI-installed Windows Agent also
passed `TestLiveWindowsMSIRejectedPackageRecovery` using real service control,
the generated helper and actual Windows Installer. The deliberately invalid
package returned **1620**. The installed executable remained byte-for-byte
unchanged, its protected backup matched, and the previous SYSTEM service was
`Running` afterward at the canonical Program Files path. The baseline SHA-256
was `6715f0ec48cef103ed9a90b12df2f8be2549aada6c161a5b4c49ea940784d1d7`.
Retained protected evidence is
`C:\ProgramData\PrintMaster-MSI-Rejection-2650186340`, including the helper,
invalid MSI, installer log, run-bound outcome and previous executable backup.
Effective Windows PowerShell policy remained `RemoteSigned`; no execution
policy was changed.

The live test requires both
`PRINTMASTER_LIVE_MSI_FAILURE=reject-invalid-msi-on-test-agent` and
`PRINTMASTER_LIVE_MSI_BASELINE_SHA256` matching an independently recorded
installed executable. It refuses an unreadable/existing pending update,
unexpected service registration or a service that is not initially running.
It deliberately creates no authorized target or live pending state. Run only
the exact test in an explicitly approved elevated disposable installation;
ordinary runner/CI/release runs strip every `PRINTMASTER_LIVE_*` variable.
Unexpected outcomes require inspecting the retained evidence and actual
installer/service state before recovery, not killing Windows Installer or
blindly restarting the service.

On 2026-10-21, the same disposable test Agent also qualified the remaining
Windows MSI transaction behaviors with retained protected evidence under
`C:\ProgramData\PrintMaster-MSI-Qualification-20261021`:

- real helper success from an MSI upgrade (`0.32.1.0`),
- running-service repair recovery,
- rollback after files were already changed (with observed candidate bytes),
- rollback on service-start failure (`Error 1920`, `1603`),
- real installer contention (`1618`) without killing the active transaction,
- bounded helper timeout (`124`/`MSI_TIMEOUT`) while the installer remained
  active, preserving `timed_out` and allowing natural installer completion,
- and end-to-end Manager `stable` MSI authorization, helper handoff, startup
  reconciliation, pending-state clearance and final `0.32.3.0` service state.

During this final sequence the Agent remained at the canonical Program Files
service path, enrollment/identity configuration hashes remained unchanged
(`preserved_identity_config_files=4`), and effective policy stayed
`RemoteSigned`. No execution policy was changed.

The first gate is now qualified for the documented disposable-Windows scope;
seven top-level gates remain. Production publisher trust and unattended
activation remain off.

Local regression validation of application revision
[`046c799`](https://github.com/Printmaster-Org/printmaster/commit/046c799f3aada3f11af137cae433cd5f3e6dc832)
passed the full updater package, shared native selection, all 329 Jest tests,
updater vet/staticcheck, 34 documentation tests and a fresh Hugo build with
local link/asset/anchor checks. The live rejection test correctly skipped in
the ordinary runner and passed in the separate explicit elevated invocation.
This focused run did not rerun Playwright, unrelated Go packages, Docker E2E
or non-Windows native execution.

#### Historical permission-gate regression boundary

The wider Agent regression reruns also exposed failures outside this permission
selection: WebSocket fixed-wait timing, a source-observation probe assertion,
a Windows helper fixture outcome and a short-budget SNMP fixture connection/
cleanup panic. Local Jest also hit a Bash subprocess timeout/cleanup failure
in the Beta-release fixture (22 suites passed, one failed). The affected
permission/workflow Jest selection passes. Constrained Agent reruns pass the
complete updater package but fail the source-observation assertion. Hosted
Linux Common/Agent/Server, JavaScript/browser tests, native Windows/macOS,
and mock/real-Docker E2E all pass in the linked run, including the required
**CI Passed** aggregate at `eac1f11`. That is a green hosted CI baseline, not
proof that the earlier local failures did not occur. Those local failures
remain visible and must be reconciled before final release.
This slice does not alter unrelated tests or hide failures with retries/
time-budget changes.

The updater does not defend against local administrators, a compromised service
identity, or arbitrary machine rollback. Path
checks/rehashing are not a claim of race resistance against those identities.

### Remaining 0.32 release gates: security handoff reconciliation

This checklist reconciles the security handoff with application revision
`0d64d3d`, not the contributor fork implementation. These are required outcomes,
not newly completed controls. **P0-06 (independent update trust) remains open.**
**P0-07 (privileged updater hardening) remains open for transaction, migration
and final platform/service qualification**, although its permission/safe-path
subgate is now qualified above.
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

2. **Qualify protection from verification through installation (P0-07).**
   The Agent now creates protected Unix updater trees and Windows ACL-protected
   updater/trust trees, rejects symlink/reparse redirection, binds final paths
   to the TUF descriptor and previous backup, and uses atomic Unix replacement
   without a copy-over fallback. Raw Windows service installation now registers
   a    protected Program Files copy. Separate actual Linux/macOS UIDs and the
   Windows MSI/SYSTEM access-control boundary now pass the matrix above.
   Continue qualification of native service lifecycles, MSI/package transaction
   paths and supported 0.31.x migrations. Test adversarial substitution and failures
   at each platform handoff. A raw Windows service still registered outside the
   protected location must be migrated before auto-update; MSI and package
   transactions are not qualified by the raw-binary path. Do not treat path
   rehashing alone as eliminating races, and do not claim resistance to local
   administrators or a compromised service identity.

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

5. **Finish truthful bounded update UX and package-manager failure behavior.**
   Verify bounded package-manager contention/repair behavior without blindly
   killing privileged installation transactions. Retain ordered progress across
   helper outcomes; expose check/download/verification failures rather than
   reporting success on handoff. Make explicit user-initiated upstream checks
   visibly report their bounded progress and final outcome, including
   reconnect/reload. These safeguards must not be described as universal
   unattended recovery.

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

### Resumed slice: end-to-end publisher hosting (2026-10-19)

Implemented at [source fee8571](https://github.com/Printmaster-Org/printmaster/commit/fee8571297bc24a22da4a579b576a6d7d02ef984).

The [hosting runbook](/development/update-hosting/) consolidates the previously
open orchestration/qualification item: protected lane-serialized workflow,
retained-payload recovery before fresh signing, conditional custody, twelve-hour
freshness scheduling, explicit failure/recovery issues and authenticated public
B2-to-Server mirror pulls. Owner-approved isolated rehearsal uses separate
buckets, protected authority, disposable root/routine keys and scoped expiring
credentials; existing production bucket contents and backup keys are untouched.

The [live matrix](/development/update-hosting/#qualification-evidence) passed:
intentional interrupted bootstrap, exact pending version-1 recovery on a fresh
runner, normal version-2 advancement and read-only health/mirror verification.
Failure issue creation and automatic recovery closure were verified. A separate
Windows live pull matched independent authority; the real authenticated Server/
TUF target boundary is covered by integration tests.

**Hosting item qualified and closed.** Rehearsal and production publisher opt-ins
are disabled after testing. Production root/key provisioning, independent backup
verification and explicit activation remain the next separate gate; no production
signing or release authorization is implied. Deployed Server timer/permissions
are installation configuration, not a silently active production mirror.

### Resumed slice: independent publication-record custody (2026-10-19)

Implemented at [source 67567b2](https://github.com/Printmaster-Org/printmaster/commit/67567b26ca121e8a18e6bedf28c9183d9774e49a).

The owner approved a dedicated repository and public visibility after GitHub's
Free plan rejected private branch protection. The public records-only repository
has administrator-enforced restricted pushes, linear history and no force-push/
branch deletion; its Actions are disabled. The explicit generation-zero state
contains no publication. No signing or delivery credentials were provisioned.

The optional delivery integration conditionally reserves the exact authenticated
publication before public writes and advances latest only after verified delivery.
The subsequent hosting slice retains the complete payload before this reservation
so a fresh runner can recover it.
Interrupted/lost responses require explicit retries of the same sealed bytes;
pending/conflicting authority cannot be selected as latest or silently reset.
Restore can obtain both pins from the independently configured authority and
requires its root to match the supplied trusted root. Owner-managed pins remain
supported for explicit offline procedures.

See [custody operations and limits](/development/update-publication-custody/).
This is independent of B2/Server, not GitHub or a compromised GitHub signer.
Owner-held independent records remain necessary. CAS reservations are not bucket
locks. **Next:** protected single-writer orchestration and restricted credentials,
recovery of pending sealed state before signing, then isolated disposable-key
live upload/retention/recovery/failure rehearsal and freshness/alerts/mirroring.
Reported Actions/Pages degradation did not require a dispatch or deployment.

### Resumed slice: pinned retained-state restoration (2026-10-19)

Implemented at [source 0444e42](https://github.com/Printmaster-Org/printmaster/commit/0444e42f038e4ce3c977e856b4569ac5995bdb4c).

Added `update-restore`: explicit read-only recovery from a separately held
latest-safe timestamp fingerprint and matching sealed-record fingerprint.
The second pin authenticates retained history/orphan inventory outside the
current signed timestamp dependency chain. Delivery now prints both fingerprints
and binds its record output to the actual sealed inventory.

The B2 reader accepts only restricted read-only recovery access and can locate
exact pinned bytes behind newer conflicting versions/hide markers. Matching
versions require valid identity/length and unexpired Governance/365-day retention.
Pagination, versions, downloaded bytes, file inventory, selected aggregate bytes
and elapsed time are bounded; missing/corrupt/expired/unreadable state does not
become an automatic insecure reset.

Only existing empty, protected, separate local workspace/record directories
are accepted. Complete root/history/TUF/hash/version authentication precedes
local metadata writes. A durable incomplete marker gates both low-level and
managed publishers after partial local writes; crashes/stale locks and partial
restores require authorized review, not auto-cleanup. Valid restored state
preserves inventory/high-water and continues versions. Expired routine metadata
can be restored for authenticated refresh but remains blocked for delivery.

Tests exercise poisoned-latest/hidden versions, exact pagination/byte/version
bounds, read-only capability enforcement and upload blocking, independent-pin
failures, corrupt/unsigned/missing dependencies/history, empty-directory/lock/
Windows junction checks, local write failures, subsequent version advancement
and routine-expiry recovery without a delivery bypass.

**Next at completion of that slice:** independent latest-record custody/advancement, protected single-writer
orchestration and authoritative high-water selection; isolated disposable-key
live recovery/publication rehearsal, then freshness/alerts and Server mirroring.
The tool cannot tell that an owner-supplied old pin pair is latest. No production
keys, credentials, uploads, workflow activation or pushes in this slice.

### Resumed slice: sealed remote delivery primitive (2026-10-19)

Implemented at [source 19ca5a9](https://github.com/Printmaster-Org/printmaster/commit/19ca5a95413adbaf9cc223b50ce9925c1d26e3cd).

Added a B2 Native API adapter and `update-deliver` CLI for an already sealed
local backup. The read-only preflight shares bounded HTTP/configuration checks
with the adapter; it does not gain write authority. Delivery requires an exact
publication pin, independently recorded previous remote pin (or explicit
first-publication bootstrap), and asserted external single-writer ownership.

Captured metadata bytes are checked for root/history identity, signatures,
hash/version bindings and expiry. Private content-addressed recovery objects
and records are retained/read back before public writes; every recovery version
must report unexpired Governance retention covering at least 365 days from
upload. Uploads are independently read back by B2 file ID. Public immutable
metadata precedes timestamp-last delivery, with a pre-commit timestamp/expiry
recheck and final read-back. Errors/hide markers/conflicts are explicit;
ambiguous commits are retried using the same sealed bytes, not by signing
again or automatically resetting metadata.

Tests cover ordering, retention filtering/mode/duration failures, receipt/byte
mismatches, foreign endpoints, hidden objects, backup/record failures,
interrupted/ambiguous commit retry, diverged timestamp, expiry (including the
exact boundary), replayed older publication and real TUF client authorization
through a test public mirror. No live B2 upload, retention behavior,
service/installer or remote restoration qualification is implied.

**Limits/next:** the serialization flag is a caller assertion, not a lock.
Object Lock preserves versions, not current names against new uploads.
Records in the same recovery bucket are not independent latest-state custody.
Next implement protected single-writer orchestration, remote history/high-water
restoration and independently held latest pins, then a disposable-key rehearsal
in isolated test buckets, scheduling/alerts and B2-to-Server delivery.
No production keys, delivery credentials, uploads or workflow activation.

### Resumed slice: read-only B2 configuration preflight (2026-10-19)

Implemented at [source commit 65cd3ab](https://github.com/Printmaster-Org/printmaster/commit/65cd3ab42eee107ffbc856f5f64ca91647831746).

Added a Native API v4 checker and manually dispatched GitHub workflow, disabled
unless explicitly enabled on `main`, using a dedicated environment and separate
bucket-scoped inspection keys. The checker rejects write/delete/key-management/
retention-bypass authority, wrong bucket visibility/endpoint, lifecycle cleanup
and missing or non-Governance/365-day recovery defaults. Requests are bounded,
redirects are rejected, and service bodies/credentials are not logged.

The owner created dedicated public metadata/private recovery buckets with
keep-all versions and recovery default retention of 365 days. Screenshots do
not identify retention mode. The web-console procedure documents Compliance;
the runbook now explains owner-only future-default changes through the CLI and
minimal inspection-key/GitHub setup. No credentials, remote reads/writes,
retention changes, workflow activation or production signing were performed by
the implementation. Subsequently the owner configured the dedicated environment,
inspection secrets and Governance defaults and approved a
[successful live preflight](https://github.com/Printmaster-Org/printmaster/actions/runs/39276227518)
at `65cd3ab42eee107ffbc856f5f64ca91647831746`. Only manual read-only inspection
is enabled; this does not replace a real upload/retention rehearsal.

**Historical next:** owner configures inspection credentials/environment and confirms
Governance defaults; perform live preflight, then implement serialized remote
state restoration, verified recovery-before-publication, independent latest
records and timestamp-last delivery/resume. Scheduled freshness, live failure
notifications and B2-to-Server mirroring remain open.

### Resumed slice: managed local publication transaction (2026-10-19)

Implemented at [source commit 108d75a](https://github.com/Printmaster-Org/printmaster/commit/108d75a6c1b8d17809eb3ff1817daa1f437e5032).

The owner selected GitHub Actions plus Backblaze B2 and approved implementing
the local transaction before remote credentials/hosting activation.
`update-metadata` now offers managed mode with `-backup`, `-records` and
`-mirror` together. Four existing non-nested directories are required; keys
remain outside outputs and operators must pre-provision trusted permissions.

Cooperating publishers acquire exclusive lock files across workspace, backup,
record and mirror roots. The workspace must match the highest retained record.
One signed publication is staged/sealed, signatures/hash bindings/expiry are
revalidated, and immutable backup plus record files are synced/read back before
workspace/mirror timestamps advance. Versioned files precede each timestamp.
`-resume` finishes the sealed publication without signing again or loading keys;
it rejects changed roots, tampering, expiry and divergent destinations.

Tests exercise real TUF verification through the local mirror, freshness
history retention, backup/record failures before visible commit, immutable
conflicts, explicit resume after delivery failure, lock contention, workspace
rollback, changed/missing/expired pending state, routine transition and CLI mode.
This is local filesystem behavior, not B2 consistency/retention or live alerts.
All shared-module tests and relevant vet passed; focused transaction/CLI suites
also passed repeated runs. Actual Windows junction rejection passed. Unix tests
cross-compiled only; no remote-storage or installer qualification is implied.

**Limits:** local cooperating-process locks, protected directory assumptions and
synced/read-back files do not prove independent backup custody or cross-host/
power-loss-safe commits. Crash locks, unsealed preparations and interrupted
final cleanup may need authorized manual repair. Low-level publishing remains
an explicitly exclusive-owner primitive, not a lock-aware bypass.
See the maintained [managed-mode runbook](/development/update-signing-operations/#managed-local-publication-transaction).

**Historical next slice:** choose/provision GitHub/B2 bucket/state/record permissions and
retention, wire remote backup-before-publication with timestamp-last delivery,
then scheduled freshness and verified failure alerts. No production keys,
secrets, buckets or signing activation were changed.

### Resumed slice: routine-key replacement and pinned publisher recovery (2026-10-19)

Implemented at [source commit 6596e21](https://github.com/Printmaster-Org/printmaster/commit/6596e21dec763d737b0f2605532519d68bce1529).

`update-keys rotate-routine` now generates three replacement routine keys in
protected new outputs and authorizes the next root using the unchanged offline
root key. No previous routine private key is required. Previous files are
preserved; old routine keys no longer authorize the new root's metadata.

`update-metadata` now prints the committed timestamp SHA256 for an independent
latest-publication record. Its optional `-expected-timestamp-sha256` pins a
restored workspace to that exact independently recorded commit before refresh.
It checks signatures, dependency hashes/versions and complete, internally
consistent root history, preserves targets and increments metadata versions.
Expired routine metadata can be refreshed; the final root must be unexpired.

For a key transition, `-previous-root` additionally requires that timestamp pin
and verifies an exactly-one-version root successor through both authorities.
Only this explicit operation imports the previous role signatures; normal
publishing has no old-key fallback. New metadata uses replacement routine keys
only. Interrupted pre-commit attempts retain immutable outputs; retries do not
overwrite orphan versions or conflicting root bytes.

Tests cover real TUF clients across restart and a skipped publication, retained
targets/monotonic versions, old-key revocation, lost old routine keys, unauthorized
offline signers, key reuse/separation, protected CLI outputs, stale/missing
backups, invalid pins, missing/corrupt dependencies, skipped roots, incomplete
history, repeated transitions and explicit CLI recovery/transition paths.
All shared tests and relevant vet, Agent client/updater suites and focused
Server metadata tests passed. Rotation/recovery suites also passed twice with
fresh disposable keys. Unix ceremony tests cross-compiled only; no installed
service/package/ACL qualification is implied.

**Limits:** the independent record must actually identify the latest safe
publication. Signatures alone cannot establish that a backup is latest, and
root-history consistency is not proof of historical provenance. Owners must not
compute a recovery pin from the backup or Server. Publication, record backup
and distribution still require exclusive serialized ownership. Already
compromised artifacts/clients, lost latest records or all root keys, root
compromise, and Agent checkpoint repair are not automatically recoverable.
Production signing and release readiness remain blocked.

The current [owner runbook](/development/update-signing-operations/) now lives
separately from this historical release plan. It replaces the embedded setup
instructions below, retaining their old anchors as links.

**Next slice:** protected serialized publication, independent state-record/
backup sequencing, public distribution and scheduled freshness/verified alerts,
then an explicit owner activation rehearsal. Do not generate production keys yet.

### Resumed slice: owner provisioning tools and release guards (2026-10-19)

Implemented at [source commit 0ab8856](https://github.com/Printmaster-Org/printmaster/commit/0ab88567d77178525d23591dc0152526193b1f04).

The `common/cmd/update-keys` tool supports:

- `init`: generates four distinct Ed25519 keys, an offline `root.pem`,
  three routine PEM files and a self-signed public `1.root.json`. Outputs go
  into three **new, separate** directories, never into the source checkout.
- `verify-keys`: loads every restored private key and checks its public key ID
  against an independently trusted public root. An unrelated or missing key is
  an explicit failure. Verification remains available after root expiry for
  offline recovery; it authorizes no updates. It does not establish backup
  independence or encryption.
- `rotate-root`: creates a replacement offline key and next versioned root,
  signed by both old and new authorities. It leaves routine keys unchanged,
  preserves the previous files and refuses existing output directories.
- `check-root`: checks self-authorization, future expiry, positive version,
  consistent snapshots and the initial policy: four distinct Ed25519 keys,
  exactly one key and threshold one per role. It reports the public file's
  SHA256 fingerprint, version and expiry, never private key material.

New directories have owner-only Unix mode `0700`; private files use `0600`.
On Windows, directories are created with a protected inheritable DACL granting
full access only to the current user, SYSTEM and local Administrators. Files
inherit those grants. Tests inspect the actual directory/file DACLs. Linked
ancestors are rejected, including a real Windows junction in the tests.
The owner must still choose trusted, non-shared parents on a trusted machine:
this is not protection against an administrator, a compromised owner account
or a concurrent process able to replace those parents. These ceremony ACLs
do **not** close P0-07's separate installed-Agent/staging permission gate.

Outputs are exclusive and synced; an interrupted/failed ceremony may leave
partial protected output, which must be reviewed and not reused. There is no
multi-file transaction, automatic key deletion, memory erasure or custom
encryption scheme. The PEM files are plaintext on the ceremony filesystem;
encrypted storage and encrypted backup custody remain owner responsibilities.

Tagged Stable/Beta Agent CI builds now run `check-root` before building or
packaging. Local Agent `-Release`/`--release` builds run it before optional
version increments. Non-Dev Agent Docker builds run it in the builder before
compilation. An unprovisioned, expired, malformed or policy-incompatible root
stops these builds. Dev builds remain possible with the deliberately `null`
root, but cannot authorize updates. Direct `go build` is not a release guard;
the runtime still rejects unprovisioned trust. A valid root alone does not
prove the remaining release gates or authorize a rollout.

Tests use disposable keys for generation, role separation, Windows ACL/file
inheritance, junction rejection, restored-key matches/mismatches, invalid
arguments/paths/roots, old-signer rejection and non-overwrite. A real TUF client
pins root 1, verifies a release, restarts and accepts published root 2 through
the signed chain while persisting the new root. Policy/expiry/overflow and
workflow guard tests cover failure cases. Unix mode/symlink tests require Unix
execution; cross-compiling them is not runtime qualification.
Both actual local build functions were also executed against an isolated
copied-source fixture with the unprovisioned root: they rejected it before
optional version increments and left the fixture's VERSION unchanged. Container
guard placement has workflow/script tests, not a new container runtime test.

**Historical slice boundary:** routine-role replacement and pinned publisher
recovery were implemented in the subsequent slice above. Production key setup,
protected publishing/freshness automation and Agent trust-state repair remain
pending. No production keys, signing secrets, hosting or activation were changed.

#### Owner ceremony rehearsal and eventual provisioning

Moved to the maintained
[owner ceremony](/development/update-signing-operations/#owner-ceremony-rehearsal-and-eventual-provisioning).
The procedure remains rehearsal-only until explicit production approval.

#### Root rotation and recovery limits

See [offline root rotation](/development/update-signing-operations/#offline-root-rotation),
[publisher recovery](/development/update-signing-operations/#publisher-state-recovery)
and [compromise/loss limits](/development/update-signing-operations/#compromise-and-unrecoverable-loss).
These maintained procedures supersede this slice's earlier incomplete notes;
there is still no automatic Agent-checkpoint reset or root-compromise recovery.

### Resumed slice: embedded-root wiring and metadata delivery (2026-10-19)

Implemented at [source commit ec0735c](https://github.com/Printmaster-Org/printmaster/commit/ec0735c457a84cdb0b865a494086c7276f9eee83).

The Agent worker now constructs the real shared TUF verifier through its
authenticated Server client. Bootstrap bytes come only from the build-embedded
`agent/update_publisher_root.json`; the committed value is deliberately `null`,
meaning unprovisioned, not a disposable test root. Null/empty or malformed roots
produce an explicit setup error and leave the manager without authorization
capability. There is no network bootstrap or permissive fallback. To activate
trust later, the owner must provision public root metadata through the source/
build process and rebuild; private signing keys must never be committed.

The verifier uses `{datadir}/update-trust/metadata` and its sibling integrity
checkpoint, separate from the updater's download/staging directories. Its
HTTP client preserves the existing Server TLS/CA transport and timeout,
reads the current token per request and confines requests/redirects to the
Server origin and supported metadata filenames. Runtime integration does not
strengthen any pre-existing intentionally configured insecure TLS policy;
independent publisher signatures are still mandatory.

The new machine-authenticated metadata route serves an operator-populated,
read-only public mirror configured by `releases.publisher_metadata_dir` or
`RELEASES_PUBLISHER_METADATA_DIR`. It does not fetch upstream files, sign them,
or carry private keys. It confines reads to that directory, restricts filenames
to top-level consistent snapshots, bounds file size and returns exact bytes.
See [the metadata route contract](/api/protocol/#publisher-metadata-delivery-unreleased)
for statuses, authentication and resource limits.

Tests cover real signed metadata over custom-trusted TLS, current-token
rotation, unrelated embedded root rejection, cross-origin and unrelated-path
redirect rejection, caller cancellation, null/malformed roots, exact Server byte
delivery, machine/user-token separation, absent/unconfigured mirror behavior,
file/name bounds and TOML/environment configuration.

**Still blocked:** this is wiring, not production activation. Current default
builds remain unable to authorize updates until a real public root is
provisioned and matching signed metadata is distributed. Restricted release/
freshness automation, routine-key rotation/recovery tooling and owner ceremony
are not complete. Package updates remain explicitly blocked; protected
privileged handoff, application downgrade policy and real OS qualification are
still required. P0-06/P0-07 remain open. No production keys, secrets, permissions
or hosting changes were made.

**Next recommended slice:** prepare tested owner key/root provisioning and
rotation/recovery tooling before asking the owner to generate production keys,
or complete authenticated package delivery/protected handoff first. Do not
enable a remote dev rollout merely because the transport now works in tests.

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

### Client trust lifecycle (2026-10-22, unreleased)

Implemented at
[source 8b6b5b7](https://github.com/Printmaster-Org/printmaster/commit/8b6b5b7d1c38d895900bf34f3dc64f5453e30c5e),
paired with the [owner runbook](/development/update-client-trust/).

The shared verifier now retains the greatest local UTC time of a successful
exact-target authorization in its existing checkpoint. More than five minutes
of backward clock movement blocks updates before network access or state writes.
Failures never advance that time; partial authenticated TUF version advances
are still checkpointed. An intact older schema-1 checkpoint without time history
is upgraded on the next successful authorization without dropping metadata
hashes. Clock/expiry/version/state diagnostics preserve their original error
chains and provide local UTC and explicit next actions. They never trust Server
time, bypass expiry, stop the existing Agent or authorize an installation.

The new offline `common/cmd/update-client-trust` owner tool provides read-only
`inspect` and externally serialized `repair`. Repair validates every source role
against the retained local checkpoint before writing, preserves damaged evidence
and restores only those exact metadata bytes. The checkpoint is never replaced,
so version and successful-verification-time floors cannot be lowered by this
operation. Missing/corrupt checkpoints, stale backups, unknown/ambiguous fields,
unsafe file types and unexpected trusted roles are refused. Interrupted
multi-file restoration can be retried from the same exact source/checkpoint.

This implements the owner's approved conservative repair scope, not independent
checkpoint replacement, whole-machine rollback detection, root compromise
recovery or protection from an administrator rewriting both metadata and its
checkpoint. A bad initial clock has no prior time anchor; a successful check
under a badly advanced clock can require further owner investigation after
correction. Older binaries may discard the new optional time field. The
long-offline/mixed-version migration gate remains separate.

Windows and isolated Linux fixtures cover clock boundaries/history, failure
retention, legacy migration, every top-level role's expiry, valid publisher
refresh/root rotation, exact repair/evidence, stale/missing/corrupt authority
rejection and replay after repair. Manager fixtures verify visible failures,
an unchanged binary, no pending installation and normal check recovery.
Existing restart/target-cleanup rollback tests and snapshot/workspace cleanup
tests remain in the validation selection. No host clock or installed local
service is changed by this qualification. Production trust activation remains
off.

Use the [client trust diagnostics and repair runbook](/development/update-client-trust/)
for exact paths, commands, backup/serialization requirements and limitations.
The subsequent bounded UX gate is described below.

### Truthful bounded update UX (2026-10-22, unreleased)

Implemented at
[source f0433bd](https://github.com/Printmaster-Org/printmaster/commit/f0433bdeba4e6337cb856809926ef6adbfc920a8).

The Agent panel, Fleet version cells and Agent detail dialog now retain
distinct checking, download, staging, installation, restart and confirmation
phases. Command delivery and reconnect never manufacture installation success.
Only a run-bound Agent `succeeded` snapshot displays Updated; legacy unsequenced
completion and unknown phases stay unconfirmed.

After two minutes without newer progress, an active observation explicitly
shows that the outcome is unknown, retaining the run/phase and blocking
duplicate installation. This is not a native transaction timeout or permission
to kill/retry an installer. UI-generated progress interpolation is removed.
Reported download percentages are used without rescaling; unknown percentages
remain unknown. Cancellation is limited to current pre-installation phases.
Failures, including full trust/owner-repair guidance, no longer disappear after
a short toast. Newer ordered runs replace terminal results.

Update dispatch/status requests have fifteen-second browser bounds. Late
responses cannot overwrite live progress; lost responses remain ambiguous.
Existing durable Agent snapshots restore results across browser reload and
SSE reconnection. The privileged helper deadlines, protected journals and
native package recovery boundaries from the earlier gates are unchanged.

Manual upstream cache sync now exposes its latest ordered snapshot through an
administrator-only GET on the existing `/api/v1/releases/sync` route. POST/409
responses add the initial/current snapshot without changing their dispatch
semantics. The task is explicitly bounded to its advertised one-hour deadline.
Browser status polling recovers missed SSE, stops after that deadline plus a
two-minute observation allowance and never reports stale work as completed.
Errors remain visible. This record survives browser reload, **not a Server
process restart**; no retained record is not evidence of success. Scheduled
intake remains separate.

The [operator guide](/guides/updates/) documents every display state, safe
follow-up, mixed-version limits and exact Server UI API scope. The seventeen
Server OpenAPI operations remain a separate reviewed subset, not a claim that
the new status route is included there. No production trust, package service,
publisher credentials or update activation is changed.

Qualification covers exact observation boundaries, silent replay, terminal/
new-run ordering, stale/unknown/legacy progress, reconnect/reload, persistent
trust/repair errors, duplicate dispatch, late/lost responses, upstream
authorization, real cache success/failure and HTTP deadline cancellation.
Real embedded Agent/Fleet pages are exercised on all six configured browser
projects, including mobile layouts. Native installer/service qualification is
the separately recorded earlier evidence, not rerun by browser fixtures.

The next ordered gate is supported 0.31.x, mixed-version and long-offline
migration qualification.

### Resumed slice: persistent trust-state integrity (2026-10-19)

**Historical baseline:** the current diagnostics/repair scope is described above.

Implemented at [source commit 2693a7d](https://github.com/Printmaster-Org/printmaster/commit/2693a7d3e7fcaaa6d36f4256f9380afadc474990).

At that revision, this slice completed local metadata loss/corruption detection in the shared TUF
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
- Windows raw-binary and MSI helpers now use bounded waits and run-bound durable
  outcomes. A 30-minute MSI timeout does not terminate `msiexec`; actual MSI
  transactions, service recovery and installer-created permissions remain
  unqualified. Durable helper outcomes are not a power-loss-safe transaction or
  an independent recovery service.
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
- Updated Agents allow an exact same-version reinstall and bypass maintenance timing, but enforce publisher trust, channel restrictions, version pins and no-downgrade policy. Legacy Agents may still bypass pins or downgrade; do not treat their Force behavior as the hardened policy.
- The force flow reuses the existing download/staging pipeline, so telemetry and log noise remain consistent with regular updates, and the helper restart logic still ensures the service restarts cleanly after the reinstall.
- Every manual `check_update` or `force_update` invocation now emits a structured audit log entry capturing the actor, agent identity, payload metadata (reason/trigger), and tenant scope so compliance teams can trace both ad-hoc and scheduled rollouts. Future orchestration jobs should call the shared `logAgentUpdateAudit` helper to record automated runs with a `trigger=scheduled` tag.

## Agent UI Self-Update Controls

- The agent settings page now includes an **Agent Updates** panel that surfaces the current/available version, channel, effective policy source, and the timestamps for the last/next scheduled check.
- Status pills reflect the manager lifecycle (`checking`, `downloading`, `applying`, etc.) so desk-side operators can see whether an update is already running before triggering new work.
- The panel polls `/api/autoupdate/status` every 45 seconds and exposes a "Refresh Status" button for on-demand snapshots when troubleshooting.
- Two local actions are available:
   - **Check for Update**: POST `/api/autoupdate/check`, identical to the server-driven `check_update` command.
   - **Force Reinstall**: POST `/api/autoupdate/force` with reason `agent_ui_force_reinstall`, which bypasses maintenance timing only and permits an exact authenticated same-version reinstall. It does not bypass pins/downgrade policy or establish automatic health-gated recovery.
- Buttons automatically disable when the auto-update manager is unavailable (agent offline, policy disabled, etc.) or when a run is already in progress, preventing conflicting operations.
- The Agent manager holds exclusive operation ownership from manifest lookup through installation. Overlapping scheduled checks, manual checks, and forced reinstalls return an `update operation already in progress` error inside the manager; a `pending` status does not release ownership. Requests are rejected rather than queued. Scheduled checks retain their normal rescheduling behavior.
- The local POST handlers above still acknowledge background dispatch with HTTP `200` (`check_triggered` or `force_triggered`), not installation success or a synchronous busy response. A later manager busy error is logged; inspect status/logs before retrying. Server-delivered commands report manager errors through update progress. These write operations are outside the reviewed [Agent OpenAPI read subset](/api/agent/); no route, authorization, or response-schema change is introduced by operation locking.
- Callouts highlight when a newer build is available so onsite staff know when a manual reinstall will have an effect.

This plan should be treated as a living document; check off tasks as they land and adjust phases as we learn more from early prototypes.
