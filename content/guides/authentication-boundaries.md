---
title: "Authentication and Agent access"
linkTitle: "Authentication"
description: "Understand Server accounts, SSO linking, enrollment, and local Agent sign-in."
weight: 65
---

PrintMaster has separate credentials for people and machines. A Server user account is not an Agent token, and an Agent's enrollment token is not a reusable login.

| Credential | Used for | Keep it private |
| --- | --- | --- |
| Server user session | Server UI and documented user-session API operations | Yes |
| Agent session | A local Agent UI session | Yes |
| Agent token | Agent-to-Server heartbeat, inventory, and metrics | Yes |
| Join token | Initial Agent enrollment; short-lived or one-time according to the enrollment flow | Yes |

## Server accounts and SSO

Sign in with a local Server account or an administrator-configured identity provider. Roles and tenant assignments determine which Agents, devices, settings, and reports you can access. See [tenant access](/guides/tenant-isolation/) for the user-visible scope.

An SSO identity is linked by its provider and subject, not by matching email addresses. A new identity is not automatically linked to an existing account just because the email is the same. If you cannot sign in after an email or identity-provider change, ask a Server administrator to review the account link; do not create a second privileged account as a workaround.

Provider role and tenant settings determine the access granted to newly provisioned users. Review those settings before enabling an identity provider, especially when it can create administrator accounts.

## Enroll an Agent

Use the Server's **Add Agent** flow and assign the Agent to the correct tenant. Treat the generated installation command, link, and join token as credentials. Share them only with the person installing that Agent, and redact them from logs, screenshots, and support requests.

Pending, expired, and revoked deployments appear on the Server's Agents screen. Right-click an entry to revoke its invite, regenerate it, or remove it. Regeneration revokes the old token and shows the replacement once; removing an entry also revokes its invite.

Before approving a pending Agent, verify the displayed machine and tenant with the person who requested enrollment. Replacing an Agent creates a new identity; it is not an in-place update or repair of the existing installation. Keep the old Agent available until the replacement is visible and reporting successfully.

For platform-specific setup, see [Installation](/guides/install/). For service operations, see [Run the Agent as a service](/deployment/agent-service/).

## Sign in to an Agent

A local Agent UI and the Server UI use different sessions. In Server authentication mode, an Agent sign-in is allowed only when the Server can identify that Agent and the user is authorized for it. A Server login alone does not grant access to every Agent.

If an Agent sign-in fails, check that the Agent is enrolled, connected to the expected Server, assigned to the expected tenant, and that your account has access to that tenant. Do not send a Server session token or Agent token through a browser form unless the supported application flow requests it.

## Troubleshooting access

- **You can sign in but cannot see an Agent:** ask an administrator to verify the Agent's tenant assignment and your membership.
- **An SSO account does not match an existing local account:** request an explicit account-link review; email matching is not an automatic recovery method.
- **An enrollment token was exposed or sent to the wrong person:** ask an administrator to revoke or replace it before continuing.
- **A Server or Agent session expired:** sign in again through the relevant UI. Do not reuse an Agent machine token as a user session.

Use the [API reference](/api/) for documented credential requirements. Do not assume every internal route has the same authentication behavior.
