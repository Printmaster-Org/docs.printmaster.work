---
title: "Configure the copier for scan-to-SMB"
description: "Translate a working SMB destination into the copier's host, share, and account fields."
weight: 40
---

This is a **brand-neutral checklist**, not an exact menu walkthrough. Field names and supported authentication vary by model and firmware. [Find your brand](/printers/) to see which model-specific guides are planned or available.

## Before opening the address book

- Finish either the [manual Windows setup](/guides/manual-smb-setup/) or [PrintMaster Scans setup](/guides/scans/), or use an administrator-provided SMB share.
- Obtain the receiving host, share name, any subfolder, and dedicated account credentials from its administrator.
- Confirm the receiving host stays powered on and reachable, and that the copier supports your organization's allowed SMB and authentication settings.
- Use an approved administrator login for the device. Do not publish credentials or rely on default passwords.

## Map the destination fields

For an **example** share `\\SCANPC\scans`, with a local receiving-PC account `SCANPC\scans`:

| Copier setting | What it represents | Example |
| --- | --- | --- |
| Protocol | The destination type | SMB |
| Host / server | Receiving PC's resolvable name or approved stable IP | `SCANPC` |
| Share / folder | Published SMB share, not a drive path | `scans` |
| Subfolder | Existing folder inside the share, if needed | Leave empty unless required |
| Port, when requested | Approved SMB service port | TCP `445` |
| User | Dedicated receiving-host account | `SCANPC\scans` |
| Password | That account's current password | Enter securely; do not use an example password |

Some devices expect a **single UNC path**, while others split host, share, and folder into separate fields. Do not enter the whole path into every field. `C:\scans` is a local Windows path, not a share name.

Where the device separates username and domain/workgroup fields, consult its documentation for the local-account format. A local PC account and an Active Directory account are not interchangeable.

## Save, test, and verify delivery

1. Add or edit an approved address-book destination. Avoid changing unrelated entries.
2. Save the settings and use the device's connection test if it provides one.
3. Send a small, non-sensitive test document from the actual scanner.
4. Confirm the file appears in the intended folder and opens for its intended recipient.
5. Record the responsible administrator and credential-rotation process. Update each device destination when the password changes.

A successful connection test is not proof of file delivery. If delivery fails, use [scan-to-SMB troubleshooting](/scanning/troubleshooting/) rather than repeatedly changing unrelated settings.

{{< image-placeholder title="Annotated copier SMB destination form" >}}
Capture a tested model's destination form with synthetic host, share, and account values. Annotate separate host/share fields versus a full UNC path. Record model and firmware; hide passwords, serial numbers, and customer addresses.
{{< /image-placeholder >}}

## Security boundaries

Do not expose SMB to the internet, enable SMB1, disable the firewall, enable guest access, or weaken authentication policy to accommodate an old copier. Ask the administrator or vendor for a supported configuration or replacement path instead.
