---
title: "Scan to email"
description: "Planned: SMTP prerequisites, provider restrictions, device configuration, and delivery troubleshooting."
status: planned
weight: 60
---

## Coverage to add

- Explain direct provider submission versus an administrator-managed mail relay.
- Record supported authentication methods and TLS requirements per tested device and mail provider.
- Sender identity, recipient restrictions, certificates, DNS, and clock prerequisites.
- Attachment size limits, scan format, delivery logs, and controlled test messages.
- Link brand-specific procedures from the [printer knowledge base](/printers/) when verified.

This is a different workflow from [scan-to-SMB](/scanning/): the copier sends mail rather than writing to a shared folder. Do not assume that a device supports a provider's current authentication requirements or use personal mail credentials as a workaround.

{{< image-placeholder title="Copier-to-mail-provider or approved relay diagram" >}}
Show the two supported architectures only after testing them. Identify trust boundaries and redact SMTP credentials, addresses, and customer domains.
{{< /image-placeholder >}}
