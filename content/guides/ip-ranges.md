---
title: "IP ranges for discovery"
description: "Choose an IPv4 address range for the Agent to scan."
weight: 25
aliases: ["/development/range-syntax/"]
source: "docs/dev/RANGE_SYNTAX.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

Add only networks you are authorized to scan. Start with a small range or a single known printer, then expand as needed. Large scans can generate substantial network traffic.

The range editor accepts these IPv4 formats:

| Format | Example | Addresses scanned |
| --- | --- | --- |
| Single address | `192.168.1.42` | One address |
| CIDR | `192.168.1.0/24` | Addresses in the subnet |
| Full range | `192.168.1.10-192.168.1.20` | The inclusive start-to-end range |
| Short range | `192.168.1.10-20` | Last-octet range on that subnet |
| Wildcard | `192.168.1.*` or `192.168.1.x` | Last-octet range |

Enter one range per line. Blank lines and lines beginning with `#` are ignored. The parser deduplicates addresses and limits expansion to 4096 addresses per configuration to help prevent accidental large scans. IPv6 ranges are not supported.

Short forms such as `10-20` depend on the range editor's Add or Override mode because the subnet comes from the configured default. When in doubt, use a full address range or CIDR notation.

For setup steps, see [first discovery](/guides/getting-started/) and [discovery settings](/guides/configuration/).