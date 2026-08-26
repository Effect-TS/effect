---
name: bundle-analysis
description: Bundle analysis. Use when measuring current size, comparing fixtures or Git refs, inspecting composition, or cleaning a retained comparison worktree.
---

Choose the workflow that matches the question. Read
`packages/tools/bundle/README.md` for the complete tool contract.

## Stable fixture comparison

Use the repository fixture set to measure a commit or branch against a base:

```sh
pnpm bundle-compare <base-ref>
```

For the latest commit, use `HEAD~1`. Read `tmp/bundle-stats.txt` and summarize
non-zero differences. This workflow caches `tmp/bundle-base` for reuse.

## Selected fixture comparison

Use only fixture paths explicitly named by the user or created for the current
investigation. Keep temporary fixtures small, self-contained, and under
`scratchpad/`; do not add them to the stable fixture corpus.

```sh
pnpm bundle-compare-selected --base <ref> scratchpad/<fixture>.ts
```

The wrapper cleans up its base worktree by default. Use `--keep-base` only for
repeated measurements, then remove the worktree after the final run.

## Bundle composition

When the user asks what a bundle contains rather than how its size changed, run:

```sh
pnpm bundle-analyze scratchpad/<fixture>.ts
```

Read the generated `*.raw-data.json` first and report the largest modules,
dependency groups, and surprising inclusions. Use the treemap HTML only when a
visual artifact is requested. The analysis build preserves readable names, so
its generated `.min.js` size is not an exact comparison measurement.

## Current size

For current size without a base comparison, run:

```sh
pnpm build
pnpm --dir packages/tools/bundle report ../../../scratchpad/<fixture>.ts
```

The direct report resolves Effect packages from built `dist` output, so run the
build immediately before the report.

## Cleanup

Remove a retained comparison worktree with:

```sh
git worktree remove --force tmp/bundle-base
```

Verify cleanup with `git worktree list`. Report generated artifact paths and any
build or measurement command that could not be run.
