---
title: "Scan to a NAS or file server"
description: "Planned: receive scans on managed storage instead of a Windows workstation."
status: planned
weight: 35
---

## Coverage to add

- Separate guides for tested NAS platforms and Windows Server; do not reuse workstation steps without verification.
- Dedicated service account, least-privilege share/filesystem permissions, subfolders, quotas, and retention.
- Supported SMB dialects, authentication, and name-resolution requirements per platform and copier.
- Test file creation as the scan account, then an actual copier scan.
- Password rotation, backups, ransomware exposure, and access auditing.

The existing [manual Windows guide](/guides/manual-smb-setup/) targets a workstation, not a validated NAS or Windows Server setup. For a destination your administrator has already prepared, use the [copier-side checklist](/scanning/copier-setup/).

{{< image-placeholder title="NAS share and service-account permissions" >}}
Capture a tested storage platform with synthetic accounts and share names. Label the platform/version, both permission layers, and the device destination fields.
{{< /image-placeholder >}}
