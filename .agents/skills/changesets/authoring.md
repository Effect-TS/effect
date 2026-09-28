# Authoring changesets

Update the changeset already introduced by the PR. If there is none, create one
`.changeset/<descriptive-name>.md` for the complete PR:

```md
---
"effect": patch
"@effect/affected-package": patch
---

Describe the consumer-visible change and why it matters.
```

Default to one short paragraph of one to three sentences. State the changed
behavior or API and, for a break, the required migration. Leave motivation,
implementation details, benchmarks, test coverage, and the development history
in the PR description.

When several related consumer-visible effects cannot be stated clearly in that
paragraph, use compact bullets with one outcome per bullet. Keep them in this
file under the PR's shared purpose.

List every directly affected published package. Do not list packages merely
because they share the fixed release group in `.changeset/config.json`.

Choose the bump from current release policy:

- On a stable line, use `patch` for compatible fixes, `minor` for compatible
  additions, and `major` for breaks.
- In `.changeset/pre.json` `rc` mode, follow the current convention of recording
  v4 release-candidate changes, including breaking cleanups, as `patch` unless a
  maintainer requests another level.
- Ask when release mode or intent is ambiguous.

Write for consumers. Use a `### Breaking changes` section when several breaks
need separate scanning. Include before/after examples only when they materially
clarify migration.

Validate frontmatter against published package names and inspect nearby current
changesets for wording and release convention. Never run `changeset-version` or
`changeset-publish` as contributor validation.
