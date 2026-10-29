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
- Windows PowerShell 5.1 or PowerShell 7, running as Administrator.
- Internet access to `scans.printmaster.work` and GitHub for the loader and release download.
- A printer with scan-to-SMB support and network access to the receiving PC.

Windows 7, 8, 8.1, and Windows Server are not validated support targets.

## Prepare the PC

1. Open [the Scans website](https://scans.printmaster.work/) and review the linked loader script before executing it.
2. Open Windows PowerShell or Terminal **as Administrator** and run:

   ```powershell
   irm https://scans.printmaster.work/scans.ps1 | iex
   ```

3. Review the username, password, local directory, and SMB share name. The defaults are user `scans`, directory `C:\scans`, and share `scans`. Keep the generated password or use one that meets your organization's policy.
4. Use the **Settings** gear to select which steps to run, then choose **OK**.
5. In development builds with the existing-account safeguard, review the warning before confirming a password change. Declining cancels setup without changing the account. Scans refuses to change an account in the local Administrators group; choose a different username or cancel. It also refuses the update if it cannot verify group membership. See the [release availability note](#folder-access-review-unreleased).
6. Review the progress list. If Windows rejects the password, follow the [password correction steps](#windows-rejects-the-password) before proceeding. On successful account setup, use **Copy Password** and store the credential securely before selecting **Done**. Do not share it in screenshots or issue reports.

The utility can create or update the dedicated local account, hide it from the login screen, create the folder, set folder permissions, create the SMB share, and add a desktop shortcut. It can also set non-domain network profiles to Private and enable File and Printer Sharing and Network Discovery firewall rules.

**Review these changes before running on a managed PC.** Published v2.1.4 grants the scan account Full Control, the current administrator Full Control, and Everyone Modify on the folder; domain-joined PCs also receive a Domain Users Modify grant. It configures the share for the scan user. Use only on trusted networks with your administrator's approval. Development changes below restrict new-folder permissions and add confirmation before changing an existing account's password. When a password is changed, update any printers using those credentials.

The windows carry the PrintMaster logo and "Provided by PrintMaster" attribution. The desktop shortcut retains the original scan-folder icon.

## Setup walkthrough

These screenshots are rendered from the current app's window definitions with example credentials and simulated progress/completion states. They illustrate the interface, not a real machine setup run.

### Choose the destination

![PrintMaster Scans setup window with the PrintMaster logo, account and folder fields, and Provided by PrintMaster attribution](/images/scans/scans-setup.png)

Review the username, generated password, local folder, and share name before proceeding. The screenshot is an example, not a credential to reuse.

The app follows your Windows light or dark theme:

![PrintMaster Scans setup window in the light theme with the same account, folder, and share fields](/images/scans/scans-setup-theme.png)

### Select setup steps

![Scans settings dialog with account, folder, permissions, share, shortcut, and networking options](/images/scans/scans-settings.png)

The gear opens the step selection dialog. Review which changes are appropriate for this PC before choosing **OK**.

### Review progress

![Scans progress window showing setup details with Copy Password and Done disabled during processing](/images/scans/scans-loading.png)

Wait for processing to finish and inspect the retained step details. A skipped step can be intentional, such as hiding an account on a domain-joined PC.

### Save the credential and test

![Scans completion window showing finished steps and enabled Copy Password and Done buttons](/images/scans/scans-finished.png)

After successful account setup, copy and securely store the applied password, then configure and test the printer destination as described below. If the utility reports **Completed with errors**, follow the remediation rather than treating the destination as ready.

### Themed confirmation and input dialogs (unreleased)

Development builds use the app's Solarized light/dark theme, PrintMaster logo, and attribution for account confirmation, folder-access review, password retry, startup/step errors, and clipboard confirmation. These shared dialogs center on their parent when present and scroll longer content while keeping the action buttons available. The change is not yet in the published stable utility.

The existing-account dialog offers **Change password** and **Cancel setup** instead of native Windows Yes/No buttons. Cancel is the keyboard default; closing the dialog or pressing Escape does not authorize an account change. Folder review retains its recipient input, and password retry retains **Generate**, **Retry**, and **Cancel setup**.

Dialog footers place the neutral, outlined **Cancel** to the left and the filled approval action at the far right. Folder/share permission confirmations initially focus Cancel rather than approving changes with Enter. Permission table rows remain readable on hover, selection, and when focus moves elsewhere; borders distinguish selection and keyboard focus.

The shared dialog work does **not** make passwords masked or eliminate plaintext handling. [Password handling improvements are tracked separately](https://github.com/Printmaster-Org/scans/issues/29). Currently entry fields show the password, setup state holds strings, and copying places the accepted credential on the clipboard. Avoid screenshots, recordings, or shared clipboard history/sync that could expose it. Future masking and secure-state changes will be documented when implemented; a themed window is not a security boundary.

## Folder access review (unreleased)

**Availability:** the account safeguards and folder policy described here are development changes on `main`, intended for the next release. They are not yet available through the published stable utility. Pushing code or updating this guide does not publish a release. The screenshots above do not show the new folder-access dialog.

When **Set folder permissions** is selected, development builds show a review before creating a folder or writing its permissions:

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

## SMB share safety (unreleased)

**Availability:** this describes development code on `main`, not the published stable utility. A successful setup step is not a substitute for testing printer delivery.

Scans verifies that the selected folder exists and compares an existing share's local path before touching its permissions. If the share name belongs to another folder, **Share name conflict** lets you enter another name to check or cancel share setup. The unrelated share is never repointed, deleted, or recreated. Use the share name actually reported in the progress details when configuring the printer.

For a **new share**, only the explicitly qualified local scan account receives **Change** share access, rather than Full. No Everyone share grant is added. Share permissions and NTFS permissions are separate layers: Change allows SMB file operations, including deletion, but the folder ACL still restricts what the account can actually do.

For an **existing share at the correct folder**, review the account/Allow-Deny/access table before choosing **Apply share access**:

- The warning counts grants to other or unresolved accounts, scan-account Full grants, and Deny entries. Resolved account names appear where Windows can resolve them; raw identities remain available in tooltips.
- All **Remove** checkboxes start unchecked. Remove an Allow grant only after confirming nobody still needs it. Unselected grants and all Deny entries remain.
- Removal is unavailable when multiple Allow entries resolve to the same principal: the Windows revoke operation would remove them together. Manage those entries in Windows instead.
- Scans adds Change if the scan account lacks an existing Change or Full Allow. Existing scan Full stays unless explicitly selected for removal; selecting it replaces Full with Change.

Retained group grants may provide broader effective access, and a Deny entry may still block scanning. Use Windows share/security tools to review effective access; the table lists entries rather than calculating group membership or combining share and NTFS access.

Cancel, Escape, or closing the dialog makes no share changes, but earlier account/folder changes are not rolled back. Share failures are reported in progress details and the final error state; independent selected steps can still run. If a permission update partly succeeds, the error lists changes already applied. Inspect the share before retrying; Scans does not attempt an automatic rollback.

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

With the password-retry dialog, setup pauses before running any remaining steps:

1. Enter a replacement password, or choose **Generate** to create another one. **Retry** is disabled while the field is empty or contains only whitespace.
2. Choose **Retry** to attempt account setup again. Your username, folder, share name, and selected setup steps are preserved. If Windows rejects another password, edit or generate one and retry again.
3. After Windows accepts the password, setup resumes with the remaining selected steps, including account hiding, folder permissions, and SMB share configuration. **Copy Password** becomes available on completion when account creation/update is selected and succeeds; it copies the accepted replacement, not the rejected password.

Choose **Cancel setup** or close the password dialog to stop all remaining setup steps. The progress window reports **Canceled**, **Copy Password** stays disabled, and **Done** closes the window. Cancellation does not roll back changes from previous setup runs.

Use a longer password with uppercase and lowercase letters, numbers, and symbols, without the username. Generated passwords cannot guarantee compliance with every policy. Ask your administrator about the effective minimum length, complexity, history, and other restrictions rather than disabling policy.

**Release availability:** the retry dialog requires a release containing the password-retry change. Merging utility code does not update the downloaded stable release. Older versions instead show a password-error popup, skip account-dependent steps, and may continue independent steps with **Copy Password** disabled. In those versions, finish the run and rerun setup with a replacement password, or use a newer published release that includes the dialog.

### Setup finishes with errors

Read the popup and retained progress details. Domain trust failures, access denied, and shares in use have specific remediation. Correct the reported issue and rerun with the appropriate steps selected. "Completed with errors" does not mean the destination is ready.

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
