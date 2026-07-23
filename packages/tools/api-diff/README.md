# API Diff

`@effect/api-diff` compares the consumer-visible TypeScript declarations emitted
by two repository revisions. Its JSON output is canonical; the Markdown report
is intended for migration review and does not make semantic-version
compatibility claims.

Run a complete comparison from the repository root:

```sh
pnpm api-diff \
  --base-ref v3 \
  --head-ref origin/main \
  --output tmp/api-diff/run
```

Both refs are required and are resolved to commit SHAs before work starts. The
tool builds detached disposable worktrees with each branch's native build,
discovers every public package entrypoint independently, extracts both snapshots
with one pinned TypeScript compiler API, and caches successful snapshots by
commit and compiler.

The command writes:

- `base.snapshot.json`
- `head.snapshot.json`
- `diff.json`
- `report.md`

Unmatched APIs are reported as removals from the base and additions in the
head. Likely replacements are reported separately for review, including
cross-module moves and the paired type/value facets of class-style APIs.
