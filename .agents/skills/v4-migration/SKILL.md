---
name: v4-migration
description: V3-to-v4 migration guidance. Use when changing how a v3 public API maps to v4, editing migration annotations, or regenerating migration/v3-to-v4.md.
---

Update migration guidance when a change alters how a v3 public module or API
maps to v4, including a rename, move, removal, replacement, or materially
different contract. A new v4-only API with no v3 counterpart does not
automatically need an annotation.

## Annotations

Add or update one YAML file per v3 module under `migration/annotations/`. Use
stable API IDs without a trailing `#type` or `#value` facet:

```yaml
effect/Effect#async:
  replacement: Effect.callback
  note: Use the callback constructor.
  example: Effect.callback((resume) => resume(Effect.void))
```

Every annotation requires `replacement` and `note`; `example` is optional. Use
`replacement: none` when no direct replacement exists and explain the supported
migration strategy rather than inventing an equivalent API. Verify suggested
replacements against implementation and tests.

## Generated reference

Treat `migration/v3-to-v4.md` as generated. Check annotations and regenerate
with explicit committed refs containing the change:

```sh
pnpm api-diff --base-ref origin/v3 --head-ref HEAD --check
pnpm api-diff --base-ref origin/v3 --head-ref HEAD --write-doc migration/v3-to-v4.md
```

The API diff reads refs through detached worktrees. If the API change is
uncommitted, `HEAD` does not contain it. Update annotations when their IDs are
already known, but defer the check and regeneration and report that limitation.
Do not create a temporary commit solely to run the tool.

After regeneration, inspect the generated diff for unrelated API movement or
stale refs. Run every applicable check in the root `AGENTS.md` validation
matrix.
