---
title: "Backup & restore"
description: "Planned: verified backup, recovery, and rollback procedures for supported deployments."
status: planned
weight: 40
---

## Coverage to add

- Inventory persistent data, configuration, credentials, and encryption material for Agent and Server deployments.
- Document consistency requirements and supported backup tools for each storage backend.
- Verify restoration into an isolated environment, including ownership and access checks.
- Separate an application upgrade rollback from a database migration rollback.
- Define a recovery drill, expected downtime, and checks before reconnecting production Agents.

Do not treat copying a running database or container filesystem as a verified backup. Until this procedure is tested, follow your storage platform's documented backup process and review the [database upgrade guide](/deployment/database-upgrade/) before migrations.

{{< image-placeholder title="Backup and isolated restore workflow" >}}
Diagram the data and configuration that must be backed up, the isolated restore target, and the checks required before production cutover.
{{< /image-placeholder >}}
