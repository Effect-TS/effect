---
name: changesets
description: Changesets. Use after consumer-visible runtime, public API, entrypoint, lifecycle, or wire-format changes, or when deciding whether a change is breaking.
---

Record what consumers need to know after implementation and focused validation
are complete.

## Workflow

1. Inspect the complete diff and identify directly affected published packages.
2. Classify consumer impact across source types, runtime behavior, package
   entrypoints, required services, lifecycle, and persisted or wire data.
3. Perform the breaking-change audit below.
4. Create or update one coherent changeset when required.
5. Validate its frontmatter and consumer-facing description.

Do not include unrelated worktree changes.

## Requirement

Create a changeset for:

- observable runtime behavior changes, including bug fixes;
- additions, removals, or changes to exported values and public types;
- package entrypoint or export-map changes;
- changes to required services, errors, resource ownership, defaults, or
  lifecycle behavior;
- persisted data, serialization, protocol, or wire-format changes.

Tests-only changes, internal behavior-preserving refactors, documentation-only
changes, JSDoc maintenance, and unpublished repository tooling normally do not
need a changeset. When impact is unclear, inspect package exports and
consumer-visible declarations rather than inferring from source location.

## Breaking changes

A change is breaking when valid existing consumer code, configuration, or data
must change to keep compiling or behaving according to its previous contract.
Audit these surfaces:

- **Names and locations:** removed or renamed exports, moved entrypoints,
  removed compatibility exports, or changed module paths.
- **Call compatibility:** required parameters added, parameters removed or
  reordered, accepted inputs narrowed, overload resolution changed, or generic
  parameters and defaults changed.
- **Result compatibility:** incompatible return or error types, widened output
  that callers previously narrowed, removed or changed members, or added service
  requirements.
- **Runtime contracts:** changed defaults, failure modes, interruption,
  concurrency, ordering, resource lifetime, acquisition, cleanup, or mutation
  semantics that require callers to adapt.
- **Data compatibility:** persisted schemas, encoded values, database layouts,
  protocols, or wire formats that are no longer read or written compatibly.

Additive exports, optional parameters, and behavior-preserving implementation
changes are normally non-breaking. A bug fix restoring the documented contract
is normally non-breaking, but still describe meaningful operational impact and
any consumers that must adapt. Verify representative existing calls when
overload ordering, structural assignability, or inference makes compatibility
uncertain.

The API diff tool reports declaration changes mechanically; it does not decide
semantic-version compatibility. Review runtime and data contracts separately.

## Record

Create one `.changeset/<descriptive-name>.md` per coherent change:

```md
---
"effect": patch
"@effect/affected-package": patch
---

Describe the consumer-visible change and why it matters.
```

List every directly affected published package. Do not list packages merely
because they share the fixed release group in `.changeset/config.json`.

Choose the bump from current release policy:

- On a stable release line, use `patch` for compatible fixes, `minor` for
  compatible additions, and `major` for breaking changes.
- When `.changeset/pre.json` is in `rc` prerelease mode, follow the current
  convention of recording v4 release-candidate changes, including breaking
  cleanups, as `patch` unless a maintainer requests another level.
- Ask when release mode or intent is ambiguous.

Write for consumers. State the changed behavior or API and give concrete
migration guidance for every break. Use a `### Breaking changes` section when
several breaks need separate scanning. Include before/after examples only when
they materially clarify migration. Omit implementation details and test
descriptions, and name concrete behavior rather than making generic improvement
claims.

Validate frontmatter against published package names and inspect nearby current
changesets for wording and release convention. Run every applicable check in
the root `AGENTS.md` validation matrix. Never run `changeset-version` or
`changeset-publish` as contributor validation.
