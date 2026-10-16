---
title: "Manual scan-to-SMB setup on Windows"
description: "Create a dedicated scan account, secure a shared folder, and configure a printer destination without running the Scans utility."
weight: 36
---

This guide prepares a Windows PC to receive documents from a printer or copier over SMB **without running a script**. It is an alternative to the [PrintMaster Scans utility](/guides/scans/), not an additional step required after using it. No PrintMaster Agent or Server is needed.

The procedure uses a dedicated, non-administrator local account and limits access to that account and approved administrators. It intentionally does not reproduce the utility's broader folder permissions or account-hiding behavior.

## Before you begin

- Use a Windows 11 PC and an administrator account to perform setup. Windows 10 22H2 has similar controls, but its operating-system support is separate from this guide.
- Confirm the printer supports SMB versions and authentication permitted by your organization.
- Use a trusted network where the printer can reach the PC. The PC must stay powered on and awake to receive scans.
- On a managed or domain-joined PC, get your administrator's approval. Group Policy may control account creation, network logon, sharing, firewall rules, and password requirements.

Example values used below:

| Setting | Example |
| --- | --- |
| Receiving PC name | `SCANPC` |
| Local scan account | `scans` |
| Local folder | `C:\scans` |
| Share name | `scans` |
| Network path | `\\SCANPC\scans` |

Replace `SCANPC` with the actual name shown under **Settings > System > About**. Use your organization's approved addressing or DHCP reservation if the printer needs a stable IP address.

## 1. Create a dedicated local account

1. Open **Settings > Accounts > Other users** (called **Family & other users** on some Windows versions).
2. Choose **Add account**, then **I don't have this person's sign-in information**, then **Add a user without a Microsoft account**.
3. Create the `scans` account with a unique, strong password that meets local or domain policy. Store the credential in an approved password manager.
4. Leave the account type as **Standard User**. It does not need administrator rights.

If `scans` already exists, confirm its purpose and ownership before using it or changing its password. A password change can break other printers using the account. Do not reuse a personal or administrator credential, use a blank password, or bypass organizational password rules.

When a password expires or is rotated, update the stored credential on each printer that uses it. Have your administrator choose an approved credential lifecycle rather than disabling password expiry as a workaround.

## 2. Create the folder and set NTFS permissions

1. Create `C:\scans` in File Explorer, or choose an approved local data folder.
2. Right-click the folder, open **Properties > Security > Advanced**, and inspect its current permissions.
3. For a new dedicated folder, choose **Disable inheritance**, then **Convert inherited permissions into explicit permissions** if needed to edit inherited entries. Do not change permissions on the drive root or an unrelated existing folder.
4. Keep `SYSTEM` and the local `Administrators` group with **Full control**, plus any access required by your organization's backup or management tools.
5. Remove broad grants such as `Everyone`, `Users`, or `Authenticated Users` from this dedicated folder unless an administrator has explicitly approved them. Review all entries, including inherited or group-based access; adding the scan user alone does not remove existing access.
6. Choose **Add > Select a principal**. Set **Locations** to the receiving PC, select `SCANPC\scans`, and grant **Modify**, applying to **This folder, subfolders and files**.
7. Grant any staff who need to retrieve scans the minimum approved access, using a suitable group where possible. Apply the changes.

**Modify** lets the scan account create, read, overwrite, and delete files; it does not need **Full control**. Do not add explicit deny rules as a shortcut to removing broad access. If you cannot identify a permission entry or the folder already contains data, have an administrator review it before proceeding.

## 3. Share the folder

1. Open the folder's **Properties > Sharing > Advanced Sharing**.
2. Select **Share this folder** and set the share name to `scans`.
3. Open **Permissions**. Remove the default `Everyone` entry unless explicitly required by your organization.
4. Add `SCANPC\scans` using the receiving PC as the account location. Allow **Read** and **Change**, not **Full Control**.
5. Add any approved administrator or staff groups that need network access, with appropriate share permissions. Apply and close the dialogs.

Network access is limited by **both** share permissions and NTFS permissions. A user must be allowed by both. Do not enable guest access or turn off password-protected sharing.

## 4. Permit sharing on the intended network

- On a trusted, unmanaged network, check **Settings > Network & internet > Wi-Fi or Ethernet > Network profile** and use **Private** for the receiving PC. Do not mark a public network Private just to make sharing work.
- Under **Advanced sharing settings**, enable **File and printer sharing** for the intended profile and keep **Password protected sharing** on (its location varies by Windows version).
- In **Windows Defender Firewall with Advanced Security**, verify the appropriate **File and Printer Sharing (SMB-In)** inbound rule allows TCP 445 on the intended profile. Scope remote addresses to the printer or approved subnet where practical.
- Domain-joined PCs normally use the domain-managed profile and firewall policy. Do not override those controls; ask your administrator to permit the intended traffic.
- If a router or VLAN firewall separates the printer and PC, have the network administrator allow only the intended printer-to-PC SMB connection.

Network Discovery is optional when using an explicit hostname or IP path; it is not required for the printer to write to a known share. Do not disable the firewall, forward SMB ports from the internet, or enable obsolete SMB1 to support an old device.

## 5. Test from another Windows PC

From an authorized PC on the same network, open `\\SCANPC\scans` in File Explorer. When prompted, use `SCANPC\scans` and the dedicated password. Verify you can create and delete a temporary test file in the share.

A successful test under your personal Windows session does not prove that the scan account has access. Windows may reuse an existing SMB session to the same host. If the test uses cached credentials or reports conflicting connections, use a clean test session or ask your administrator to review the specific connection; do not disconnect unrelated shares.

If the hostname does not resolve, test the PC's approved IP address and correct name resolution or addressing. Do not confuse the local path `C:\scans` with the network path.

## 6. Configure the printer and send a scan

In the printer's web interface or address book, add an SMB destination:

| Printer field | Value |
| --- | --- |
| Protocol | SMB |
| Host / server | `SCANPC` or its reachable, stable IP address |
| Port, if requested | TCP `445` |
| Share / folder | `scans` |
| Username | `SCANPC\scans`, or `scans` with `SCANPC` in a separate domain/workgroup field if the printer requires it |
| Password | The dedicated account password |

Printer field names and account formats vary. Follow the vendor's SMB destination instructions. If host and share are separate fields, enter them separately; use `\\SCANPC\scans` only when the printer expects a full UNC path.

Run the printer's connection test, then send an actual scan. Confirm the file arrives in the folder and can be opened by the intended recipient. A connection test alone does not verify document delivery.

## Troubleshooting

| Symptom | Checks |
| --- | --- |
| Host or path not found / connection timeout | PC awake, hostname/IP correct, share exists, routing and TCP 445 permitted |
| Logon failure | Dedicated account enabled, correct local-PC qualifier, correct password, password not expired, account not locked, approved network-logon policy |
| Access denied or unable to save a file | Share **Change** and NTFS **Modify** allowed for the scan account, no conflicting deny entries, free disk space, valid filename |
| Another PC works but the printer fails | Printer's SMB version, account format, saved credentials, firmware, signing/encryption compatibility, and network path |
| Scanning stops after a password change | Update the credential on every affected printer |

Do not weaken SMB signing, encryption, authentication, or domain policy just to make an older device work. Check vendor firmware/support and use an approved receiving destination if the printer cannot meet your network's requirements.

## Maintenance and removal

- Restrict access to scanned documents and follow your organization's retention and backup policy.
- Keep Windows and printer firmware updated and periodically test delivery.
- To retire this destination, first remove it from the printer address book. Remove only the dedicated share and account after confirming no other devices use them.
- Retain or dispose of existing documents according to policy; do not delete the folder as an automatic cleanup step.

For the guided utility alternative and its screenshots, see [PrintMaster Scans](/guides/scans/).
