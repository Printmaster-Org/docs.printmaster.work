---
title: "Troubleshoot scan-to-SMB"
description: "Work out whether a scan failure belongs to the receiving host, network, credentials, or copier destination."
weight: 50
---

Start with the failing step, not the brand. Keep the exact error message, time, model, and firmware version, but remove passwords and customer information before sharing a report.

## 1. Check the receiving host

Is the PC awake? Does the expected share still exist? Has its name, address, account password, or permission policy changed?

Use the [manual Windows guide's share test](/guides/manual-smb-setup/#5-test-from-another-windows-pc) with the **dedicated scan account**. A successful test under your own administrator account does not verify the copier's permissions. Do not disconnect unrelated SMB sessions when investigating cached credentials.

If you used the utility, read the [Scans troubleshooting notes](/guides/scans/#troubleshooting). "Completed with errors" does not mean the destination is ready.

## 2. Check the network path

The copier must reach the receiving host's SMB service, normally TCP 445. An administrator should check the approved firewall profile, VLAN rules, routing, name resolution, and stable addressing.

A ping response alone does not prove SMB access; a missing ping response alone does not prove SMB is blocked. Do not disable the firewall or publish an internet-facing SMB service to test connectivity.

## 3. Check the saved destination

| Symptom | Check next |
| --- | --- |
| Host not found or connection timeout | Hostname/IP, sleeping PC, approved network path and SMB service |
| Authentication or login failure | Dedicated account, password rotation, account lockout, local/domain format, permitted SMB/authentication versions |
| Access denied or cannot create file | Both share and filesystem permissions; write access in the target subfolder |
| Path or folder not found | Share name versus local drive path; separate host/share fields; existing subfolder |
| Connection test passes, but no document arrives | Actual destination selected, job result, storage capacity, filename restrictions, receiving folder and access |
| Works until the PC restarts or changes networks | Host addressing, sleep settings, network profile and managed firewall policy |

Use the [copier-side field mapping](/scanning/copier-setup/) and consult the [brand hub](/printers/) for model-specific coverage. Do not guess error-code meanings across unrelated firmware families.

## 4. Confirm the fix

Send a new, non-sensitive scan from the copier. Verify the file arrives and opens for its recipient. Record what changed so the next administrator can maintain the setup.

{{< image-placeholder title="Scan failure triage flowchart" >}}
Show the branches for receiving-host failure, network failure, login failure, and file-write failure, followed by a real scan and recipient access check.
{{< /image-placeholder >}}
