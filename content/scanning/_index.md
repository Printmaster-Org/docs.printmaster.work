---
title: "Scanning & SMB"
description: "Set up a scan destination, configure the copier, and verify that documents arrive. No PrintMaster installation required."
weight: 30
groups:
  - title: "1. Prepare the receiving destination"
    pages: ["/scanning/printmaster-scans", "/scanning/windows-manual", "/scanning/nas"]
  - title: "2. Configure the copier"
    pages: ["/scanning/copier-setup", "/printers"]
  - title: "3. Test & troubleshoot"
    pages: ["/scanning/troubleshooting"]
  - title: "Other scanning workflows"
    pages: ["/scanning/scan-to-email"]
---

Scan-to-SMB has **two separate sides**: a PC or file server that receives files, and a copier that sends them. Preparing one does not configure the other.

These guides are useful with **any compatible printer or copier**. You do not need a PrintMaster Agent or Server. PrintMaster's **device discovery** is a different use of the word "scan": for finding printers on your network, use [first setup & discovery](/guides/getting-started/).

## Choose your path

1. **Prepare Windows:** choose either the [PrintMaster Scans utility](/guides/scans/) **or** the [manual Windows procedure](/guides/manual-smb-setup/). They are alternatives, not consecutive steps. The manual guide uses more tightly scoped permissions.
2. **Configure the sending device:** use the [copier-side checklist](/scanning/copier-setup/), then check your [brand hub](/printers/) for the status of model-specific instructions.
3. **Send a real scan:** confirm the document arrives and opens. Use [troubleshooting](/scanning/troubleshooting/) to isolate the receiving-PC, network, or copier side.

{{< image-placeholder title="The two sides of scan-to-SMB" >}}
Diagram: copier sends a document over the approved network to a named SMB share on the receiving PC or server. Label the host, share, dedicated account, and TCP 445. Distinguish the network share from the local folder path.
{{< /image-placeholder >}}
