---
title: "Printer SNMP reference"
description: "What PrintMaster reads from standard and vendor-specific printer MIBs."
weight: 40
url: "/api/snmp-reference/"
aliases: ["/development/snmp-reference/"]
source: "docs/dev/SNMP_REFERENCE.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

PrintMaster uses SNMP to identify and monitor network-connected printers and copiers. The Agent combines standard Printer-MIB values with supported vendor-specific data. A device may expose only some fields; available counters, supply names, status, and firmware details vary by model and configuration.

## Standard Printer-MIB

The [Printer-MIB (RFC 3805)](https://www.rfc-editor.org/rfc/rfc3805) defines common printer identity, counter, supply, and alert tables. Common roots include:

| Information | OID root | Notes |
| --- | --- | --- |
| Printer identity and status | `1.3.6.1.2.1.43.5` | General printer information |
| Page counters | `1.3.6.1.2.1.43.10` | Marker and life counters; units and indexes are device-reported |
| Supplies | `1.3.6.1.2.1.43.11` | Supply descriptions, levels, and capacities |
| Input trays | `1.3.6.1.2.1.43.8` | Input tray descriptions and status |
| Output trays | `1.3.6.1.2.1.43.9` | Output tray descriptions and status |

The same counter may be reported through multiple tables or with different units. PrintMaster uses device and vendor evidence to avoid assuming that a particular index always means the same color or function.

## Vendor-specific data

Some manufacturers expose additional counters, supply details, or status through private enterprise MIBs. PrintMaster supports selected mappings, but support is not uniform across every model or firmware. Missing values do not necessarily indicate a device fault; the device may not expose that metric, or SNMP access may be restricted.

For the device's reported values, check the application and review [discovery troubleshooting](/guides/troubleshooting/#discovery-issues). For supported SNMP versions, credentials, and settings, see [configuration](/guides/configuration/#agent-discovery-and-snmp).

## Reference downloads

- [Printer-MIB ASN.1 module](/media/docs/dev/Printer-MIB.mib) for use with a MIB browser. Load its referenced standard modules as needed.
- [Curated Printer-MIB JSON OID reference](/media/agent/docs/printer-mib-complete.json) for offline lookup. This is a lookup aid, not a complete device capability list.

## Network and credential safety

Use a read-only SNMP identity where the printer supports it. Prefer SNMPv3 authentication and privacy on networks that support it. If using a community-based version, use a non-default value, restrict which hosts can query it, and keep the community string private. Do not expose SNMP to untrusted networks or include production credentials and raw production walks in public issue reports.

This page describes standards and general behavior; it is not a promise that every listed OID is queried or populated by every PrintMaster release. Vendor behavior and deployed support depend on the Agent version and printer model.
