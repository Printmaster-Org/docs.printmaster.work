---
title: "Contribute documentation"
description: "Where new guides belong, how planned coverage works, and what makes a tested device procedure ready to publish."
weight: 20
---

## Documentation repository boundary

The canonical guides, API contracts, component references, research notes, and
downloadable documentation resources live in
[Printmaster-Org/docs.printmaster.work](https://github.com/Printmaster-Org/docs.printmaster.work).
The application repository no longer carries the legacy `docs/` and
`agent/docs/` trees or standalone service, E2E, and Git integration guides.
The source cleanup is recorded in
[application revision 3b6eeb8](https://github.com/Printmaster-Org/printmaster/commit/3b6eeb8586dbca8f1117ef44ad740ca194a1e7a0).

The source repository retains its overview and concise component READMEs,
contribution and security entry points, agent instructions, licenses, and
source-local test-fixture notes. Its links point here rather than maintaining
duplicate guides. Runtime assets, embedded resources, configuration examples,
and test fixtures remain with the code that uses them.

Documentation downloads belong under `static/` and must be linked from a
relevant guide, such as the [SNMP reference downloads](/development/snmp-reference/#reference-downloads).
Preserve attribution and distinguish reference material from runtime inputs.
For imported pages, keep the historical `source` and `sourceCommit` metadata;
removing the old files does not change their import provenance or published URLs.

## Where should a page live?

| Reader's task | Content directory | Entry point |
| --- | --- | --- |
| Install PrintMaster and discover first devices | `content/start-here/` | [Start here](/start-here/) |
| Use the application and manage access | `content/guides/` | [Use PrintMaster](/guides/) |
| Set up a receiving share or troubleshoot document scanning | `content/scanning/` | [Scanning & SMB](/scanning/) |
| Configure a particular brand's copier or printer | `content/printers/<brand>/` | [Printer & copier setup](/printers/) |
| Host, upgrade, back up, and operate PrintMaster | `content/deployment/` | [Deployment](/deployment/) |
| Integrate with HTTP APIs or the machine protocol | `content/api/` | [API reference](/api/) |
| Build software, investigate protocols, or record plans | `content/development/` | [Developer docs](/development/) |
| Explain component internals | `content/components/` | [Component reference](/components/) |
| Contribute, report security issues, or understand the project | `content/project/` | [Project](/project/) |

The component and project sections are linked from Developer docs rather than competing with user tasks in the top-level navigation.

## Organize for the reader

- Give each page a task-oriented title and a short `description`. Use `linkTitle` only when a shorter navigation label helps.
- Order immediate children with `weight`. For task groups, use `groups` in the section's front matter. Each group has a `title` and a `pages` array of Hugo content references. The sidebar and landing cards use the same groups.
- Unlisted immediate children appear automatically, so adding a page does not silently hide it. Missing group references fail the Hugo build.
- Link shared concepts instead of copying them. Windows share creation belongs in Scanning & SMB; a Canon-specific destination form belongs under Canon.
- Keep investigations and unverified implementation plans in Developer docs. A vendor research observation is not a verified device procedure.
- Preserve published routes and anchors. The installation, first-setup, Scans, and manual SMB pages now live in task-specific directories but retain their previous URLs with explicit `url` front matter.

## Add or expand a brand

Create `content/printers/<brand>/_index.md` with a title, description, weight, and `brand` value. Add procedures beneath that directory, such as `scan-to-smb.md`, `network.md`, or a model-family subsection once needed.

Every brand hub automatically shows the shared coverage backlog from `data/brand-topics.toml`. As a topic gains a tested guide, add a task group that links it and set `coveredTopics` to the corresponding backlog title so it is no longer presented as unwritten.

Do not combine models simply because they carry the same badge. Split by firmware/interface family when steps differ.

## Mark unfinished documentation honestly

Publish useful coverage placeholders with:

```yaml
---
title: "Brand scan-to-SMB"
description: "Planned: tested destination setup for a specific device family."
status: planned
weight: 10
---
```

Use the body to record missing evidence, models to test, required screenshots, and the intended verification. Planned pages are visibly labeled in page notices, cards, sidebar links, and search results. Do not use Hugo's `draft` flag for a placeholder that readers should be able to find.

Remove `status: planned` only when the procedure is written and verified. Historical implementation pages use `legacy: true`; they are not current setup guides.

## Image placeholders

Use a real capture brief, not a broken image link or a stock screenshot:

```text
{{</* image-placeholder title="Brand SMB destination fields" */>}}
Capture the tested model's host, share, and account fields using synthetic values.
Record model and firmware; redact credentials and customer information.
{{</* /image-placeholder */>}}
```

When the image is ready, replace the shortcode with a Markdown image, meaningful alt text, and a caption identifying the tested model/firmware or application version. Store images under `static/images/` in a topic-specific folder.

## Ready-to-publish checklist

1. Identify the exact device model, controller/interface family, firmware, or application version.
2. State prerequisites, required permissions, supported scope, and risks.
3. Write the actual tested sequence, not guessed menu paths.
4. Include redacted screenshots and explain non-obvious fields.
5. Verify the reader's intended result: a delivered scan, opened document, test print, or successful recovery, not merely a saved setting.
6. Record failure symptoms, safe troubleshooting, credential maintenance, and rollback where appropriate.
7. Add links to the relevant shared guide and brand/task hub.
8. Run the repository tests, Hugo build, and generated-site checks described in the repository README.
