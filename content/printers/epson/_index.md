---
title: "Epson"
brand: "Epson"
description: "Epson setup hub: scan destinations, Web Config, networking, printing, and maintenance."
weight: 30
groups:
  - title: "Scanning"
    pages: ["/printers/epson/scan-to-smb"]
---

Independent setup documentation for Epson printers and multifunction devices. No PrintMaster installation is required.

## Available walkthrough

The [scan-to-SMB guide](/printers/epson/scan-to-smb/) now covers **ST-C8090 Series, firmware 03.97.OJ19PB**, with actual Web Config screenshots and Epson-specific field mapping. Its interface was inspected without applying settings; a saved contact and real scan delivery still need validation.

## Model coverage

| Model | Current evidence | Limit |
| --- | --- | --- |
| ST-C8090 Series | SMB contact editor, scan defaults, and redacted/example screenshots | Delivery test pending; no settings applied |
| WF-C878R Series | [Separate configuration research](/development/vendor/configuration/epson/) on firmware 04.27.QO23Q1 | SMTP/time research, not an SMB walkthrough |
| Other Epson models | Not yet inspected for this workflow | Do not assume identical fields or capabilities |

For shared receiving-PC setup, use [Scanning & SMB](/scanning/). [Epson configuration research](/development/vendor/configuration/epson/) is separate developer evidence, not a verified setup recipe.
