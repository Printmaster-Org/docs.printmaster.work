---
title: "Security and privacy"
description: "Protect PrintMaster access, network traffic, printer credentials, and diagnostic data."
weight: 80
aliases: ["/project/security/"]
source: "SECURITY.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

## Secure a deployment

- Keep the Server, Agent web interfaces, and management ports reachable only by authorized administrators and networks. Do not expose an Agent UI directly to the public internet.
- Use HTTPS with a certificate trusted by both the browser and Agents. When using a reverse proxy, restrict access to the backend listener and configure WebSocket forwarding as required.
- Set a strong bootstrap administrator password before first exposure. Add named user accounts, grant only the access each person needs, and remove access when it is no longer required.
- Protect configuration files, databases, backups, and service data directories. They may contain identity, network, or credential information.
- Use a read-only SNMP identity when supported. Avoid default community strings and restrict printer SNMP access to the Agent hosts that need it.
- Keep the application and printer firmware updated. Review [deployment guidance](/deployment/) before changing service, proxy, or database settings.

## Handle diagnostics carefully

Diagnostic reports, logs, SNMP walks, screenshots, and database exports can contain printer names, IP addresses, serial numbers, network details, or credentials. Review and redact them before sharing. Never include passwords, tokens, SNMP communities, or private keys in public issues or documentation.

## Report a vulnerability

Do not report security vulnerabilities in a public issue. Use the private **Report a vulnerability** form in the [PrintMaster GitHub Security tab](https://github.com/Printmaster-Org/printmaster/security/advisories/new). Include the affected component and version, impact, and a safe reproduction description. Do not attach real fleet data or secrets.
