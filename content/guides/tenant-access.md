---
title: "Tenant access and fleet visibility"
linkTitle: "Tenant access"
description: "Understand which users can see agents, devices, alerts, and reports."
weight: 64
url: "/guides/tenant-isolation/"
---

PrintMaster scopes Server data by the user's role and tenant membership. A device's management Agent determines which tenant owns it. Search, filters, and direct links do not grant access to another tenant's data.

## Roles and visibility

- **Administrators** can manage the Server and view the full fleet.
- **Operators** can manage the Agents and devices allowed by their tenant memberships.
- **Viewers** can read the information available in their assigned tenants but cannot perform administrative changes.

An Agent must be assigned to a tenant for its devices to appear in that tenant's fleet. A user with no tenant membership does not receive unrestricted access. Some Server-wide settings and management pages are administrator-only.

## Alerts and reports

Alerts and report definitions are visible only when the user's role and tenant scope allow it. A shared built-in report template is not permission to view another tenant's report results. Some global reports and settings are administrator-only.

If an alert, report, Agent, or device is missing, ask a Server administrator to check the user's role, tenant membership, and the Agent's assignment. Do not use another user's session or an Agent token to work around an access denial.

## API access

The Server API uses a **user session**; an Agent's machine token is not a user credential. Use the [Server API reference](/api/openapi/) for documented operations and their access requirements. The published reference is a subset of Server routes, so do not assume an undocumented endpoint has the same permissions or stability.

When tenant assignments change, access to affected data changes as well. Existing sessions do not grant access to tenants the user is no longer assigned to. Contact a Server administrator if expected access does not match the current assignments.