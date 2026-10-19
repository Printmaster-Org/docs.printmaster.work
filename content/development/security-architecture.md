---
title: "Security Architecture for Agent-Server Communication"
source: "docs/dev/SECURITY_ARCHITECTURE.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
legacy: true
---

> **Historical design proposal — planned, not shipped as specified.** This page is retained for context and stable heading anchors, not as a description of current security guarantees or valid configuration. Its MVP/Production/Enterprise labels, code sketches, phases, quotas, retention periods, JSON/YAML examples, mTLS, request signing, certificate rotation, encrypted credential synchronization, and proxy-session isolation are proposed designs, not verified shipped behavior. Some overlapping features now exist, but that does not validate this design as a whole.
>
> At reviewed snapshot `565f4c0`, server TLS supports `self-signed`, `letsencrypt`, and `custom`, with a TLS 1.2 minimum; standalone access defaults to HTTPS `9443`. Server configuration is TOML with `[server]`, `[tls]`, `[database]`, and `[security]`, not the YAML below. See the [Configuration Guide](/guides/configuration/), [Docker guide](/deployment/docker/), and [WebSocket proxy notes](/development/websocket-proxy/) for the scoped, source-checked operational guidance. This is not an exhaustive security audit.

## Overview

This historical proposal outlines a desired security architecture for agent-server communication and reverse proxying. All implementation descriptions below belong to that proposal unless independently verified against current source; do not deploy its example configuration or assume the stated controls are enforced.

## Update trust: current implementation and 0.32 release gates

This scoped update is reviewed against application revision
[`0d64d3d`](https://github.com/Printmaster-Org/printmaster/tree/0d64d3d3f67653e825349908fdbfb05e9d3ebec1);
it does not validate the historical proposal below.

The shared TUF verifier/publisher foundation is implemented, but **independent
update trust (P0-06) is not closed**. A subsequent
[2026-10-19 runtime slice](https://github.com/Printmaster-Org/printmaster/commit/56e05f4f48e82074b870139ec326af48f6c37139) now
requires injected publisher authorization before candidate acceptance and again
before installation. Legacy manifest signatures no longer authorize updates.
Subsequent startup wiring constructs the verifier from an embedded public root
and authenticated unchanged Server metadata delivery. The committed root is
deliberately unprovisioned (`null`): default builds reject offered candidates
explicitly, rather than fall back. Actual owner key/root provisioning and signed
publication/refresh activation remain unfinished. Package handoffs are also blocked until the actual package is
authenticated. See the [runtime authorization slice](/development/auto-update-plan/#resumed-slice-runtime-publisher-authorization-boundary-2026-10-19)
for coverage and operational impact. Artifact transport checks alone protect
reliability, not authenticity against a compromised application Server supplying
both malicious bytes and their matching hash.

The [owner provisioning tools and rehearsal](/development/update-signing-operations/)
([source 0ab8856](https://github.com/Printmaster-Org/printmaster/commit/0ab88567d77178525d23591dc0152526193b1f04))
now provide offline key initialization, restored-key verification, dual-authorized
root rotation and public-root release guards. New key-output directories use
real Windows ACLs or private Unix modes. The initial single-maintainer policy
uses four distinct Ed25519 keys with threshold one per role; the root key must
not enter routine automation. PEM staging is plaintext and requires trusted
encrypted owner storage and independently recoverable encrypted backups.
Self-signature validation is not independent publisher identification: confirm
the public root fingerprint through the owner record before embedding it.
These ceremony controls do not qualify installed-Agent ACLs, protect against
machine administrators or activate production signing.

Offline-authorized routine-role replacement and explicitly pinned publisher
recovery are implemented at
[source 6596e21](https://github.com/Printmaster-Org/printmaster/commit/6596e21dec763d737b0f2605532519d68bce1529).
The unchanged offline root authorizes a new root
version replacing all three online keys, without needing old online secrets.
Importing old-role-signed publisher state requires an explicit immediate previous
root and an independently recorded latest timestamp SHA256; normal publishing
never tries old role authority as a fallback. Recovery preserves retained
targets/versions and checks complete internally consistent root history, but
cannot prove a backup is latest if the owner supplies an older record too.
History consistency is not retrospective provenance. These are publisher
operations, not client trust-state resets or a complete compromise-response
system. Production custody, protected publication/refresh, poisoned-client
recovery, root compromise and unrecoverable state/key loss remain limitations.

Managed local publisher mode
([source 108d75a](https://github.com/Printmaster-Org/printmaster/commit/108d75a6c1b8d17809eb3ff1817daa1f437e5032))
now serializes cooperating writers using exclusive
lock files, checks the workspace against retained publication-record high-water
state, seals and revalidates a staged publication, and syncs/verifies backup and
record files before timestamp-last workspace/mirror commits. Explicit resume
uses the same authenticated bytes without signing another version.
These are local trusted-filesystem controls, not cross-host/object-store
transactions, permission provisioning or independently protected recovery
storage. Crashes can leave locks/unsealed state requiring operator review.
GitHub Actions plus Backblaze B2 is the selected future hosting direction;
credentials, remote backup/retention, schedules and failure alerts are not active.

A subsequent [read-only B2 preflight](/development/update-signing-operations/#b2-owner-setup-and-read-only-preflight)
([source 65cd3ab](https://github.com/Printmaster-Org/printmaster/commit/65cd3ab42eee107ffbc856f5f64ca91647831746))
checks API-reported bucket identity/access, keep-all lifecycle and Governance/
365-day recovery defaults using separate bucket-scoped inspection keys. It
rejects authority outside its read-only allowlist, confines HTTPS endpoints,
refuses redirects, bounds requests/responses and suppresses raw service errors.
The manual GitHub workflow requires explicit opt-in on `main` and a dedicated
environment. This does not prove immutable object retention behavior, external
serialization, backup read-back, independent latest-state custody or alerts.
The owner-approved [live read-only check](https://github.com/Printmaster-Org/printmaster/actions/runs/39276227518)
passed at `65cd3ab42eee107ffbc856f5f64ca91647831746`, including Governance/365-day
defaults. Only manual inspection is enabled; no signing or distribution is
activated by preflight.

The subsequent [remote delivery primitive](/development/update-signing-operations/#remote-delivery-primitive-unreleased-not-activated)
([source 19ca5a9](https://github.com/Printmaster-Org/printmaster/commit/19ca5a95413adbaf9cc223b50ce9925c1d26e3cd))
authenticates captured sealed bytes, checks explicit intended/previous remote
pins, verifies retained recovery versions and exact file-ID read-back before
public writes, and commits public timestamp last with an expiry/commit recheck.
It rejects hide markers, conflicts and ambiguous operations explicitly; retry
uses the same signed bytes. B2's required SHA1 transport checksum does not
replace TUF verification. The read-only checker and delivery adapter share HTTP/
configuration checks but retain different capability allowlists.
This is not a distributed transaction/lock or automatic latest-state recovery:
external serialization is required, and records in the same B2 bucket do not
establish independent latest-publication custody. Protected orchestration,
authoritative history restoration, live upload/retention/failure qualification,
scheduled freshness and Server mirroring remain open. No delivery credentials
or signing workflow have been activated.

The subsequent [pinned state restoration](/development/update-signing-operations/#pinned-remote-state-restoration-unreleased)
([source 0444e42](https://github.com/Printmaster-Org/printmaster/commit/0444e42f038e4ce3c977e856b4569ac5995bdb4c))
requires independently held latest-safe timestamp **and sealed-record SHA256**
pins plus the trusted current root. Pinning the record authenticates historical/
orphan inventory outside the current signed dependency chain. Read-only bounded
B2 version lookup may inspect behind poisoned latest versions/hide markers but
accepts only exact pinned bytes from valid retained versions. It cannot infer
latest authority from object timestamps or repair stale owner records.
Authentication precedes writes into empty protected local workspace/high-water
directories. Partial restores retain a durable marker rejected by low-level and
managed publishing. Expired routine state can be restored only for authenticated
refresh; delivery continues enforcing expiry. This is not Agent trust reset,
automatic root transition, in-place restore resume, independent record custody
or a cross-location power-loss transaction. No recovery credentials/workflow
or live uploads have been activated.

The subsequent [publication-record custody integration](/development/update-publication-custody/)
([source 67567b2](https://github.com/Printmaster-Org/printmaster/commit/67567b26ca121e8a18e6bedf28c9183d9774e49a))
conditionally records an authenticated pending candidate in a separate protected
GitHub repository before B2 writes, then advances latest only after exact verified
delivery. Missing, malformed, conflicting or pending authority fails closed for
latest selection; root changes need separate owner review. Restore may select
completed pins from this independently configured authority after matching the
trusted root. The records repository is public, owner-restricted and initialized
without a publication; its Actions are disabled. No production write credential
or signing workflow is provisioned. Public records reveal publication timing and
fingerprints; no private material belongs there. GitHub administrators and
authorized writers remain trusted, and this does not survive compromise/loss of
both GitHub authority and independent owner records. Conditional reservations
do not replace external single-writer serialization or live qualification.

The [metadata delivery contract](/api/protocol/#publisher-metadata-delivery-unreleased)
requires machine authentication, limits filenames/bytes, confines mirror access,
preserves existing TLS/CA policy and rejects cross-origin credential forwarding.
The Server only serves public publisher output unchanged; it neither signs
metadata nor supplies initial Agent trust. Mount only public metadata read-only,
never a private signing workspace. A compromised Server can deny service or
serve rejected metadata; independent trust does not establish availability.

The subsequent [publisher hosting pipeline](/development/update-hosting/)
([source fee8571](https://github.com/Printmaster-Org/printmaster/commit/fee8571297bc24a22da4a579b576a6d7d02ef984))
retains exact sealed payload before pending reservation, recovers pending bytes
on fresh runners without loading signers and serializes workflow lanes. Public
inventory delivery enables an independently pinned HTTPS pull process to verify
full metadata before timestamp-last Server mirror commit. Workflow failure/
recovery issues and freshness checks are explicit; they are not an independent
scheduler/watchdog. Production root/credentials/activation remain gated separately
from disposable-key hosting qualification and installed-platform permissions.

The [2026-10-19 shared-client slice](https://github.com/Printmaster-Org/printmaster/commit/2693a7d3e7fcaaa6d36f4256f9380afadc474990)
adds a persistent integrity checkpoint outside
the metadata-cache directory. It detects missing/changed previously recorded
metadata before network refresh, retains library rollback state across completed
failed refreshes, and reports checkpoint failures instead of authorizing an
update. This is local loss/corruption detection under protected-filesystem and
exclusive-owner assumptions, not a second signature protocol. See the
[resumed trust-state slice](/development/auto-update-plan/#resumed-slice-persistent-trust-state-integrity-2026-10-19)
for exact storage, tests and recovery limitations. Agent cleanup integration,
real ACL validation, clock diagnostics and operator recovery tooling remain
release work. A metadata/checkpoint mismatch after an interrupted write fails
closed and may need explicit recovery; the installed Agent must remain usable.

The required 0.32 guarantee is that serving updates does not grant authority to
authorize arbitrary releases: release Agents pin publisher root metadata,
routine signing authority stays separate from the application Server, and every
supported update path enforces standard TUF verification without legacy fallback.
Authenticated target identity includes component, OS, architecture, format and
allowed channel. Persistent trusted metadata, expiry, clock failures, explicit
application downgrade policy, key rotation and recovery are release gates, not
assumed guarantees. Legacy bootstrap cannot retroactively protect an old Agent
that has no pinned independent trust against its already compromised Server.

The closely coupled privileged-updater hardening scope (P0-07) also remains open.
The current download check precedes staging and path-based installer handoff.
Actual Windows ACLs/Unix ownership, writable parents, reparse points/symlinks and
replacement of artifacts/helpers must be inspected and tested. The exact bytes
installed must remain bound to the TUF-authenticated length/hash through a
protected privileged boundary; a replaceable sidecar or a path-only rehash is
not sufficient. This is a hardening requirement, **not a confirmed local
privilege-escalation finding** without established write-access preconditions.

See the [0.32 update release checklist](/development/auto-update-plan/#remaining-032-release-gates-security-handoff-reconciliation)
for required implementation slices, adversarial regression evidence, package
authentication, migration limits and owner signing setup. No production keys or
signing activation are implied. Independent supervision, comprehensive
power-loss recovery and health-gated rollback remain deferred; SBOM/provenance,
printer/admin origin isolation and credential hardening are separate workstreams.

## Threat Model

- **Agent → Server**: Agent authenticates to server, sends discovery data, receives config
- **User → Server → Agent → Printer**: User accesses printer web UI through server proxy that routes through agent
- **Key Risks**: Unauthorized agent access, credential interception, session hijacking, MITM attacks, unauthorized printer access

## Security Layers

### 1. Agent Authentication (MVP)

**Purpose**: Verify agent identity before accepting connections or data uploads.

**Implementation**:
- Bearer token authentication for agent API calls
- Long-lived tokens generated per agent on first registration
- Token stored securely in agent config (encrypted with machine key)
- All agent→server requests include `Authorization: Bearer <token>`

**Server Code Sketch**:
```go
func agentAuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        if !strings.HasPrefix(token, "Bearer ") {
            http.Error(w, "Unauthorized", 401)
            return
        }
        
        agentID, err := validateAgentToken(token[7:])
        if err != nil {
            http.Error(w, "Invalid token", 401)
            return
        }
        
        ctx := context.WithValue(r.Context(), "agentID", agentID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

**Agent Code Sketch**:
```go
func (c *Client) uploadDevices(devices []Device) error {
    token, _ := c.cfg.GetConfigValue("agent_token")
    
    req, _ := http.NewRequest("POST", c.serverURL+"/agent/devices/batch", body)
    req.Header.Set("Authorization", "Bearer "+token)
    req.Header.Set("Content-Type", "application/json")
    
    resp, err := c.httpClient.Do(req)
    // ... handle response
}
```

### 2. Mutual TLS (Production)

**Purpose**: Cryptographically verify both agent and server identity; prevent MITM.

**Implementation**:
- Server presents valid TLS certificate (Let's Encrypt or internal CA)
- Agent presents client certificate signed by organization CA
- Both sides verify certificates during handshake
- Certificate rotation every 90 days

**Configuration**:
```go
// Server side
tlsConfig := &tls.Config{
    ClientAuth:   tls.RequireAndVerifyClientCert,
    ClientCAs:    caCertPool,
    MinVersion:   tls.VersionTLS13,
    CipherSuites: []uint16{tls.TLS_AES_256_GCM_SHA384},
}

// Agent side
cert, _ := tls.LoadX509KeyPair("agent-cert.pem", "agent-key.pem")
tlsConfig := &tls.Config{
    Certificates: []tls.Certificate{cert},
    RootCAs:      caCertPool,
    MinVersion:   tls.VersionTLS13,
}
```

### 3. Request Signing (Production)

**Purpose**: Ensure message integrity; prevent replay attacks.

**Implementation**:
- HMAC-SHA256 signature of request body + timestamp
- Shared secret per agent (rotated monthly)
- Server validates signature and timestamp freshness (<5 min)

**Example**:
```go
func signRequest(body []byte, secret []byte) string {
    timestamp := time.Now().Unix()
    message := append([]byte(strconv.FormatInt(timestamp, 10)), body...)
    
    h := hmac.New(sha256.New, secret)
    h.Write(message)
    sig := base64.StdEncoding.EncodeToString(h.Sum(nil))
    
    return fmt.Sprintf("%d.%s", timestamp, sig)
}

// Header: X-Signature: 1730505123.a3f2b9c...
```

### 4. Proxy Session Isolation (Production)

**Purpose**: Prevent one user's session from accessing another user's printer connections.

**Implementation**:
- Server generates unique session tokens for each user proxy request
- Agent validates session token before establishing printer connection
- Session tokens expire after 15 minutes or on explicit disconnect
- Rate limiting per user (10 concurrent proxy sessions max)

**Flow**:
```
1. User requests printer proxy → Server validates user auth
2. Server generates session token → POST /agent/proxy/session/create
3. Agent returns WebSocket URL with session token
4. User connects via WebSocket → Agent validates token
5. Agent proxies user ↔ printer until disconnect or timeout
```

### 5. Credential Encryption in Transit (Production)

**Purpose**: Protect stored printer credentials when syncing with server.

**Implementation**:
- Printer web UI credentials encrypted with agent-specific key before upload
- Server stores encrypted blobs, never sees plaintext passwords
- Agent decrypts locally when needed for auto-login
- Key rotation via secure channel (mTLS)

**Schema**:
```go
type DeviceCredentials struct {
    Serial          string `json:"serial"`
    EncryptedCreds  string `json:"encrypted_creds"` // AES-GCM(username:password)
    KeyID           string `json:"key_id"`          // For key rotation
    AuthType        string `json:"auth_type"`
    AutoLogin       bool   `json:"auto_login"`
}
```

### 6. IP Whitelisting (Production)

**Purpose**: Restrict agent connections to known networks.

**Implementation**:
- Server maintains per-agent IP whitelist
- Agents behind NAT report external IP on registration
- Dynamic IP updates via authenticated endpoint
- Fail2ban integration for abuse detection

### 7. Audit Logging (MVP)

**Purpose**: Track all security-relevant events for compliance and forensics.

**Implementation**:
- Log all agent auth attempts (success/failure)
- Log all proxy session creation/destruction
- Log credential access/updates
- Structured logging with correlation IDs
- Retention: 90 days hot, 1 year cold storage

**Example Entry**:
```json
{
  "timestamp": "2025-11-01T22:45:32Z",
  "event": "proxy_session_created",
  "agent_id": "agent-001",
  "user_id": "user@example.com",
  "device_serial": "X59F000014",
  "session_id": "sess-a3f2b9c",
  "source_ip": "203.0.113.42"
}
```

### 8. Rate Limiting (MVP)

**Purpose**: Prevent abuse and DoS attacks.

**Implementation**:
- Per-agent: 100 device uploads/hour, 1000 metrics/hour
- Per-user: 10 proxy sessions, 100 requests/min
- Per-IP: 1000 requests/hour (global)
- Token bucket algorithm with burst allowance
- HTTP 429 with Retry-After header

### 9. Secure Communication Channels (MVP)

**Purpose**: Encrypt all data in transit.

**Implementation**:
- TLS 1.3 minimum for all connections
- HSTS headers (max-age=31536000, includeSubDomains)
- Certificate pinning for agent→server (optional)
- Disable weak ciphers and protocols

**Headers**:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
```

### 10. Zero-Trust Proxy Architecture (Enterprise)

**Purpose**: Minimize trust assumptions; assume breach.

**Implementation**:
- Server never directly proxies to printers
- All printer connections originate from agent (inside network)
- Server only routes authenticated user ↔ agent WebSocket
- Agent performs final authorization check before printer connection
- No credential storage on server (only encrypted blobs)

**Architecture**:
```
User Browser ←→ Server (Auth/Route) ←→ Agent (Inside Network) ←→ Printer
              TLS 1.3                  mTLS/WSS               HTTPS
```

## Implementation Phases

### Phase 1: MVP Security (Required for Launch)
- [ ] Agent bearer token authentication
- [ ] TLS 1.3 for all connections
- [ ] Audit logging (auth, proxy, credentials)
- [ ] Basic rate limiting (per-agent/per-user)
- [ ] Secure headers (HSTS, CSP, X-Frame-Options)

### Phase 2: Production Hardening
- [ ] Request signing (HMAC-SHA256)
- [ ] Proxy session isolation with expiring tokens
- [ ] Credential encryption in transit (agent-specific keys)
- [ ] IP whitelisting with dynamic updates
- [ ] Enhanced rate limiting with token bucket

### Phase 3: Enterprise Features
- [ ] Mutual TLS (client certificates)
- [ ] Zero-trust proxy architecture
- [ ] Certificate rotation automation
- [ ] SIEM integration for audit logs
- [ ] Compliance reporting (SOC2, HIPAA)

## Configuration Example

**Agent Config** (`agent_settings.json`):
```json
{
  "server_url": "https://printmaster.example.com",
  "agent_token": "encrypted:AgentTokenHere",
  "tls_cert_path": "/etc/printmaster/agent-cert.pem",
  "tls_key_path": "/etc/printmaster/agent-key.pem",
  "ca_cert_path": "/etc/printmaster/ca-cert.pem",
  "request_signing_enabled": true,
  "max_proxy_sessions": 10
}
```

**Server Config** (`server.yaml`):
```yaml
security:
  tls:
    cert: /etc/printmaster/server-cert.pem
    key: /etc/printmaster/server-key.pem
    ca: /etc/printmaster/ca-cert.pem
    min_version: "1.3"
    require_client_cert: true
  
  auth:
    agent_token_expiry: 90d
    user_session_expiry: 24h
    proxy_session_expiry: 15m
  
  rate_limits:
    agent_uploads_per_hour: 100
    user_proxy_sessions: 10
    requests_per_minute: 100
  
  audit:
    enabled: true
    retention_days: 90
    log_path: /var/log/printmaster/audit.log
```

## Security Best Practices

1. **Secrets Management**: Use environment variables or secret management service (Vault, AWS Secrets Manager) for tokens and keys
2. **Key Rotation**: Rotate agent tokens every 90 days, TLS certificates every 90 days, signing secrets monthly
3. **Least Privilege**: Agents only access devices in their network segment; users only access authorized devices
4. **Defense in Depth**: Multiple overlapping security controls; assume any single layer can fail
5. **Monitoring**: Alert on auth failures, unusual traffic patterns, rate limit hits, session anomalies
6. **Incident Response**: Document breach response plan; include agent revocation, credential rotation, forensic logging

## Threat Mitigation Summary

| Threat | Mitigated By | Phase |
|--------|--------------|-------|
| Unauthorized agent access | Bearer token auth, mTLS | MVP, Production |
| Credential interception | TLS 1.3, encrypted creds | MVP, Production |
| MITM attacks | TLS 1.3, cert pinning, mTLS | MVP, Production |
| Session hijacking | Expiring tokens, session isolation | Production |
| Replay attacks | Request signing, timestamps | Production |
| DoS/abuse | Rate limiting, IP whitelist | MVP, Production |
| Insider threat | Audit logging, least privilege | MVP |
| Data breach | Credential encryption, zero-trust | Production, Enterprise |

## Future Considerations

- **Multi-tenancy**: Isolate agents and devices by organization/tenant
- **Role-Based Access**: Fine-grained permissions (view-only, manage, admin)
- **SSO Integration**: SAML/OIDC for user authentication
- **Compliance**: GDPR, CCPA data handling for printer logs and credentials
- **Hardware Security**: TPM-backed key storage for agent certificates

---

Last Updated: November 1, 2025
