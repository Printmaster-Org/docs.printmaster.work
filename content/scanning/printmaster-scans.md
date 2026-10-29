---
title: "PrintMaster Scans: scan-to-SMB setup"
linkTitle: "Windows: Scans utility"
description: "Prepare a Windows PC to receive scanned documents, configure your printer destination, and troubleshoot setup."
weight: 20
url: "/guides/scans/"
---

[PrintMaster Scans](https://scans.printmaster.work/) is a standalone PowerShell utility provided by PrintMaster. It prepares a Windows PC to receive documents from a printer or copier using scan-to-SMB. It does not require a PrintMaster Agent or Server, and it does not configure the printer itself.

Prefer to configure Windows yourself? Follow the [manual scan-to-SMB setup guide](/guides/manual-smb-setup/) instead. That guide uses a dedicated account and scoped permissions without running the utility.

This is the **receiving-PC** side of [Scanning & SMB](/scanning/). After setup, follow the [copier-side checklist](/scanning/copier-setup/) and check your [brand hub](/printers/) for model-specific coverage.

## Requirements

- Windows 11 is the primary support target. Windows 10 22H2 has best-effort compatibility; this does not extend Microsoft's support.
- Windows PowerShell 5.1 or PowerShell 7, and administrator approval.
- Internet access to `scans.printmaster.work` and GitHub for the loader and release download.
- A printer with scan-to-SMB support and network access to the receiving PC.

Windows 7, 8, 8.1, and Windows Server are not validated support targets.

## Prepare the PC

1. Open [the Scans website](https://scans.printmaster.work/) and review the linked loader script before executing it.
2. Open Windows PowerShell or Terminal and run:

   ```powershell
   irm https://scans.printmaster.work/scans.ps1 | iex
   ```

   Since v2.3.0, a normal window works: the loader verifies the download, then requests administrator approval (UAC). The approved process re-checks the same bytes before running them, and declining the prompt cancels with no changes. Pinned older versions still need an administrator window.

3. Since v3.0.0, Scans is a four-page wizard: **Configure → Review → Apply → Done**. Nothing changes on the PC until you choose **Apply** on the Review page.
4. On **Configure**, check the scan account, password, scans folder, and share name. The defaults are user `scans`, folder `C:\scans`, and share `scans`. The password is hidden by default; **Show** reveals it and **Generate** creates a new one. Keep the generated passphrase or use one that meets your organization's policy.

   The generated password is a passphrase such as `Brook-Ocean7-Gnat-Plaza-Rumor`: five capitalized words joined by hyphens, with one random digit after one word. It is 20–30 characters long, because length is what makes a password strong, and it fits the 32-character password field common on printers. See [password errors](#windows-rejects-the-password) if Windows still rejects it.
5. Open **Advanced options** only if some steps are already handled on this PC; every step is on by default.
6. On **Review**, check the list of changes. If the username belongs to an existing account, tick the confirmation to allow its password to change; **Apply** stays disabled until you do. Scans refuses to change an account in the local Administrators group, and refuses the update if it cannot verify group membership.
7. Choose **Apply** and answer the folder-access and share reviews that open while setup runs.
8. On **Done**, check the outcome, then copy the [printer connection details](#configure-the-printer-destination) into the printer. Store the password securely; do not share it in screenshots or issue reports.
The utility can create or update the dedicated local account, hide it from the login screen, create the folder, set folder permissions, create the SMB share, and add a desktop shortcut. It can also set non-domain network profiles to Private and enable the File and Printer Sharing firewall rules, which are all SMB scanning needs. **Network Discovery is opt-in** (since v2.3.0; v2.2.0 and earlier always enabled it): select **Also enable Network Discovery** under **Advanced options** only if the printer must browse the network to find this PC. Scans never turns off a Network Discovery rule that is already enabled, and the Done page reports each firewall group as enabled, already enabled, or left unchanged.

**Review these changes before running on a managed PC.** Since v2.2.0, new scan folders give the scan account only the [minimum folder rights](#folder-access-review), and new shares grant it Change rather than Full. Existing folders, shares, and accounts are reviewed before anything changes. Releases up to v2.1.4 granted the scan account Full Control and added Everyone Modify (plus Domain Users Modify on domain-joined PCs) without review; rerunning v2.2.0 offers to clean those entries up but never removes them automatically. Use only on trusted networks with your administrator's approval. When a password is changed, update any printers using those credentials.

The windows carry the PrintMaster logo and "Provided by PrintMaster" attribution. The desktop shortcut retains the original scan-folder icon.

## Setup walkthrough

These screenshots are rendered from the current app's window definitions for an example PC named `FRONTDESK-PC`, with simulated progress and results. They illustrate the interface, not a real machine setup run.

### 1. Configure

![Scans Configure page with scan account, hidden generated passphrase with Show and Generate, scans folder, share name, and the network path printers will use](/images/scans/scans-setup.png)

Check the scan account, password, folder, and share name. The line under the share name shows the network path printers will use. If a field is missing or invalid, **Next** stays on this page and lists the problems.

The app follows your Windows light or dark theme:

![Scans Configure page in the light theme](/images/scans/scans-setup-theme.png)

**Advanced options** turns individual steps on or off. Folder permissions require creating the folder, and Network Discovery requires the network checks, so those options are disabled when the step they depend on is off.

![Scans Advanced options listing account, folder and sharing, desktop, and network steps](/images/scans/scans-advanced.png)

### 2. Review

![Scans Review page listing each change, with an amber notice and confirmation checkbox for an existing account](/images/scans/scans-review.png)

Review lists every change before anything runs. **Back** returns to Configure with your choices kept. **Cancel** on Configure or Review exits without changes.

### 3. Apply

![Scans Apply page with a progress bar and activity list](/images/scans/scans-apply.png)

Apply shows each step as it runs. The window cannot be closed mid-step. The [folder access review](#folder-access-review) and [existing-share review](#smb-share-safety) open as dialogs during this step. If Windows rejects the password, setup pauses on this page; see [password errors](#windows-rejects-the-password).

### 4. Done

![Scans Done page reporting Ready for scanning and listing printer connection details with Copy buttons](/images/scans/scans-finished.png)

Done reports one of four outcomes:

| Outcome | Meaning |
| --- | --- |
| **Ready for scanning** | Every selected step finished. |
| **Ready, with optional problems** | Only optional steps (desktop shortcut, Network Discovery) failed. |
| **Not ready for scanning** | A required step failed. Failed steps are listed first with the error and how to fix it. |
| **Setup canceled** | Setup stopped before finishing; connection details are hidden. |

**Printer connection details** lists everything the printer may ask for, each with a **Copy** button; see [Configure the printer destination](#configure-the-printer-destination). **What happened** lists every step, and **Copy summary** copies a plain-text report without the password for support requests. **Back to setup** returns to Configure with your choices kept.

![Scans Done page reporting Not ready for scanning, with a failed share step, its error, and how to fix it](/images/scans/scans-not-ready.png)

### Password handling

Since v3.0.0 ([issue #29](https://github.com/Printmaster-Org/scans/issues/29)):

- Password fields are masked by default. **Show** reveals the text until you hide it again.
- The password stays in a .NET `SecureString` from the password box to the Windows account cmdlets. Plaintext is created only briefly for **Show**, **Copy**, and the legacy `net user` fallback used on systems without the LocalAccounts module.
- Error messages and logs never include the password; text Windows echoes back is redacted.
- **Copy** marks the clipboard entry so Windows clipboard history and cloud clipboard sync skip it. When the window closes, Scans clears the clipboard only if it still holds the copied password.
- The Done page can copy the password only if it was set during this run.

These reduce exposure; they are not guarantees. `SecureString` is not encryption at rest, and PowerShell cannot zero every intermediate string. The legacy `net user` fallback passes the password on a command line, briefly visible to other administrators. Third-party clipboard managers may ignore the exclusion, and screen recording can capture a revealed password.

### Themed dialogs

Scans uses its Solarized light/dark theme, PrintMaster logo, and attribution for the folder-access review, existing-share review, share name conflicts, startup errors, and a fallback existing-account confirmation (shown only if the account appears between Review and Apply). Dialogs center on the wizard and scroll longer content while keeping the action buttons available.

Dialog footers place the neutral, outlined **Cancel** to the left and the filled approval action at the far right. Confirmations focus Cancel first; closing a dialog or pressing Escape never authorizes a change. Permission table rows remain readable on hover, selection, and when focus moves elsewhere; borders distinguish selection and keyboard focus.
## Folder access review

**Availability:** v2.2.0 and later. It opens as a dialog during the Apply step.

When **Set folder permissions** is selected, Scans shows a review before creating a folder or writing its permissions:

1. Confirm the receiving Windows user. The default comes from the desktop session hosting Scans (including RDP), not the elevated administrator account. If the accounts differ, the dialog explicitly explains the difference; **Apply permissions** confirms the selected recipient. You can choose another account, and a missing desktop identity requires an explicit entry rather than silently selecting the administrator.
2. Review the access policy. For a new folder, inheritance is disabled and the scan account receives only the advanced rights below. The recipient must be different from the scan account.
3. If this is an existing folder, inspect the permission table and select individual cleanup entries only after checking that they are safe to remove. Inheritance and unrelated custom entries are preserved.

The review groups recipient selection, scan-account access, and folder policy into separate sections. The permission table resolves Windows account names and shows Allow/Deny indicators, access, explicit/inherited source, and scope. Hover over a row to inspect its SID and exact rights. An account Windows cannot resolve is labeled **Unresolved account**; its SID remains available rather than being replaced with a guessed name. The table shows ACL entries, not calculated effective access.

Only eligible explicit cleanup entries have **Remove** checkboxes, all unchecked initially. Amber notices highlight account mismatches and access risks. The **Advanced** section contains exact scan-right details and the optional Everyone Modify grant; selecting that grant displays an additional warning.

| Principal | New-folder NTFS Allow permissions |
| --- | --- |
| Local scan account | List folder / read data; Create files / write data; Create folders / append data |
| Receiving Windows user | Full Control |
| Local Administrators and SYSTEM | Full Control |

These rules apply to the folder, subfolders, and files. Windows also adds **Synchronize** to the scan account's rule. No explicit delete, execute, permission-change, or ownership right is added to that profile. This is not a write-only drop box: read data can expose existing scans and write data can allow overwriting files. Test printer compatibility; some models need additional rights for attributes, temporary files, or rename operations.

Everyone and Domain Users are not added by default. The unchecked **Also grant Everyone Modify** option deliberately broadens NTFS access, including reading, changing, and deleting scans. It does not configure SMB share access.

For an existing folder, cleanup candidates are limited to explicit Everyone/Domain Users Modify entries and scan-account Full Control entries matching the old utility's exact rule shape. **Matching is not proof of ownership:** old Scans versions did not mark their rules. Candidates are unchecked by default; only the entries explicitly selected are removed. Inherited rules, unrelated custom entries, and protected child ACLs are not reset. Existing grants and group memberships can still provide broader effective access, and setup warns about that. Use Windows **Advanced Security Settings > Effective Access** to review access for the scan account and receiving user.

Canceling the review leaves the folder and ACL unchanged, but does not roll back earlier account changes. Folder failure or cancellation skips SMB share configuration and reports an error; independent selected steps can continue. If a folder is created but applying its ACL fails, it retains inherited permissions and the error warns about that state.

## SMB share safety

**Availability:** v2.2.0 and later. A successful setup step is not a substitute for testing printer delivery.

Scans verifies that the selected folder exists and compares an existing share's local path before touching its permissions. If the share name belongs to another folder, **Share name conflict** lets you enter another name to check or cancel share setup. The unrelated share is never repointed, deleted, or recreated. Use the share name shown on the Done page when configuring the printer.

For a **new share**, only the explicitly qualified local scan account receives **Change** share access, rather than Full. No Everyone share grant is added. Share permissions and NTFS permissions are separate layers: Change allows SMB file operations, including deletion, but the folder ACL still restricts what the account can actually do.

For an **existing share at the correct folder**, review the account/Allow-Deny/access table before choosing **Apply share access**:

- The warning counts grants to other or unresolved accounts, scan-account Full grants, and Deny entries. Resolved account names appear where Windows can resolve them; raw identities remain available in tooltips.
- All **Remove** checkboxes start unchecked. Remove an Allow grant only after confirming nobody still needs it. Unselected grants and all Deny entries remain.
- Removal is unavailable when multiple Allow entries resolve to the same principal: the Windows revoke operation would remove them together. Manage those entries in Windows instead.
- Scans adds Change if the scan account lacks an existing Change or Full Allow. Existing scan Full stays unless explicitly selected for removal; selecting it replaces Full with Change.

Retained group grants may provide broader effective access, and a Deny entry may still block scanning. Use Windows share/security tools to review effective access; the table lists entries rather than calculating group membership or combining share and NTFS access.

Cancel, Escape, or closing the dialog makes no share changes, but earlier account/folder changes are not rolled back. Share failures are listed on the Done page; independent selected steps can still run. If a permission update partly succeeds, the error lists changes already applied. Inspect the share before retrying; Scans does not attempt an automatic rollback.

The share path, scope, and ACL are checked again after review. If another administrator changes them while the dialog is open, setup stops for a fresh review. This is a best-effort check, not an atomic lock; avoid concurrent share administration. Special/scoped or unreadable shares are not edited.

On systems **without SMB cmdlets**, structured WMI lookup and a create-only operation can create a new share with an explicit Change ACL. Existing-share edits are refused in this mode; configure the share in Windows or rerun where SMB cmdlets are available. A lookup error never triggers blind creation.

## Configure the printer destination

After PC setup, open your printer's address book or scan destination settings. Labels differ by vendor:

| Setting | Value |
| --- | --- |
| Protocol | SMB |
| Host / server | The receiving PC's hostname or reachable IP address |
| Share / folder | The configured share name, `scans` by default |
| Username | The dedicated local scan user; if required, qualify it as `PCNAME\scans` |
| Password | The password successfully applied by the utility |

Since v3.0.0, the Done page lists each of these values with a **Copy** button, along with the bare and `PC\user` forms of the username, the domain (the PC name for a local account), the full host name (FQDN), network paths by name and IP address, the IPv4 addresses, and SMB port 445. Prefer the host name: DHCP can change IP addresses, so reserve the address on the router if a printer can only use an IP.

The default Windows UNC path is `\\PCNAME\scans`. If the printer has separate host and share fields, enter `PCNAME` and `scans` separately, not the full UNC path in both fields. Use the share name, not the local `C:\scans` path.

Send a test scan and confirm the document arrives in the folder. The receiving PC must remain powered on, awake, and reachable. On networks that filter SMB, have your administrator verify the intended printer-to-PC connection (normally TCP 445); do not expose SMB to the internet.

## Releases and verification

The loader selects the promoted stable release from the site's manifest, downloads its version-specific GitHub asset, and verifies SHA-256 before executing it. Download or verification failures stop setup; it does not fall back to development code.

To select a version, copy its pinned command from the [release history](https://scans.printmaster.work/#releases). For example:

```powershell
& ([scriptblock]::Create((irm https://scans.printmaster.work/scans.ps1))) -Version 'v2.1.0'
```

This still requires the online loader, manifest, and release asset. SHA-256 checks consistency with the manifest; it is not a digital signature or independent proof of publisher identity.

## Troubleshooting

### Windows rejects the password

`InvalidPassword` or `net user` error `2245` indicates that Windows rejected the scan-account password.

Setup pauses on the Apply page before running any remaining steps and shows the error with a **New password** field:

![Scans Apply page paused with the Windows password error, remediation, and a New password field with Show, Generate, Retry, and Cancel setup](/images/scans/scans-password-retry.png)

1. Enter a replacement password, or choose **Generate** to create another one. **Retry** is disabled while the field is empty or contains only whitespace.
2. Choose **Retry** to attempt account setup again. Your username, folder, share name, and selected setup steps are preserved. If Windows rejects another password, edit or generate one and retry again.
3. After Windows accepts the password, setup resumes with the remaining selected steps. The accepted password replaces the original on the Configure page and is the one shown on the Done page.

Choose **Cancel setup** to stop all remaining setup steps; the Done page reports **Setup canceled**. Cancellation does not roll back changes from previous setup runs.

Use a long password or passphrase without the username; length matters more than symbols. Generated passwords cannot guarantee compliance with every policy. Ask your administrator about the effective minimum length, complexity, history, and other restrictions rather than disabling policy.

**Release availability:** the inline retry is in v3.0.0 and later; v2.2.0 through v2.3.x show a separate password-retry dialog with the same choices. v2.1.4 and earlier instead show a password-error popup and skip account-dependent steps. If you are pinned to an older version, finish the run and rerun setup with a replacement password, or use the current stable release.

### Setup finishes with errors

Read the **Not ready for scanning** list on the Done page. Each failed step shows the Windows error and how to fix it; domain trust failures, access denied, and shares in use have specific remediation. Correct the problem, then choose **Back to setup** and apply again. **Copy summary** gives a password-free report to include in a support request. Only **Ready for scanning** means the destination is ready; versions before v3.0.0 report errors in popups and the final window shows "Completed with errors".
### The printer cannot write a scan

- Confirm the PC is awake and reachable from the printer, and check the host and share fields.
- Confirm the configured account and password match a successful setup run.
- Check the share and folder permissions and the approved firewall/network profile with your administrator.
- Verify the printer supports your organization's permitted SMB version and authentication settings. Do not enable obsolete SMB versions or disable security policies merely to make an old printer connect.

### Downloads or checksum verification fail

Check access to the Scans site and GitHub. For a checksum mismatch, stop and report the error; do not bypass verification or run the unverified file.

## Source and support

- [Scans source repository](https://github.com/printmaster-org/scans)
- [Report a Scans problem](https://github.com/printmaster-org/scans/issues) (omit passwords and sensitive network details)
- [Release and deployment guide](https://github.com/printmaster-org/scans/blob/main/docs/DEPLOYMENT.md)
