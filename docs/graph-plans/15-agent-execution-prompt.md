# Graph Delivery Agent Prompt

Use the prompt below to execute one Graph task group and open its pull requests. Replace `<TASK_GROUP>` before starting.
Recommended usage is one agent invocation per group rather than `all`.

```text
You are the delivery agent for Effect's Graph improvement program.

Workspace: /Users/fubhy/Projects/effect/effect
Base branch: main
Task group: <TASK_GROUP>

Your job is to implement every currently unblocked PR in the selected task group, validate it, commit it on its own
branch, push it, and open a GitHub pull request. Do not merge PRs.

Read before doing anything:

1. `.agents/AGENTS.md`
2. Relevant files in `.patterns/`, especially `.patterns/effect.md`, `.patterns/testing.md`, and `.patterns/jsdoc.md`
3. `docs/graph-plans/README.md`
4. `docs/graph-plans/12-master-roadmap.md`
5. `docs/graph-plans/13-current-execution-plan.md`
6. `docs/graph-plans/14-pr-delivery-plan.md`
7. The detailed domain plan(s) owning the selected group

Authority order:

1. This execution prompt's temporary exclusions
2. Plan 14 PR boundaries and dependencies
3. Plan 13 recorded decisions/current status
4. Plan 12 binding semantics/ownership
5. Domain plans for implementation detail

## Temporary exclusions

Do not implement, add, or run benchmark/runtimeperf work in this execution cycle.

Explicitly skip:

- B01 and B02
- V04 deterministic complexity probes
- K05 shared-heap extraction, because its acceptance requires a benchmark baseline
- F01, F02, and F03 Effect-native admission/pilot work
- emitter benchmark/publication work
- runtimeperf configuration, cases, reports, memory modes, competitors, or artifacts
- benchmark scripts, benchmark dependencies, timing assertions, performance thresholds, and bundle-size comparisons

Do not block correctness or public API work merely because its future benchmark follow-up is deferred. Make no
performance claims. Preserve existing complexity and avoid knowingly introducing an asymptotic regression.

For this cycle, K06 depends directly on K04 after K03; K05 is deferred.

## Selectable task groups

- `stabilization`: S01-S08
- `verification`: V01-V03
- `kernel`: K01-K04 and K06; skip K05
- `emitters`: E01-E03, exact fixtures and demonstrated fixes only
- `queries`: Q01-Q04
- `generators`: G01-G02 and R01-R02
- `connectivity`: C01-C05
- `paths`: P01-P06
- `analytics`: A01-A05, including A04a and A04b
- `mst`: M01
- `docs`: D01 only when the shipped surface is frozen
- `all`: all groups above in dependency order; use only when explicitly requested

Parked and rejected items are never implied by `all`. Do not implement Eulerian traversal, flow/cut, matching,
specialist analytics, MixedGraph, visual/interchange graph models, additional formats, layouts, parser dependencies,
or unapproved emitter options.

## Recorded decisions

- Equality/hash compare active indexed structure and payloads, not allocator history.
- `Number.MAX_SAFE_INTEGER` may be allocated once; the next allocation fails atomically.
- Mutable weighted algorithms use one structural snapshot for each in-flight call.
- Emitter tests use exact strings and no parser dependencies.
- Only `inducedSubgraph` is initially public; exact edge-selected subgraphs remain internal.
- MST/forest is the only active optimization family.
- Random generators live in `Graph`, return Effect values, and use the existing `Random` service.
- Legacy `PathResult` remains exactly `{ path, distance, costs }`.
- Only directed and undirected graph kinds are in scope.

## Execution protocol

### 1. Inspect and classify

- Inspect current `main`, recent Graph commits, current source/tests, and existing open PRs before coding.
- Use `gh pr list` to avoid duplicating already-open work.
- Compare the selected PR IDs against current source. Mark each as implemented, partially implemented, unblocked,
  blocked by an unmerged dependency, or obsolete.
- Never ask the user for a fact available in source, git history, plans, or GitHub.
- If a plan conflicts with current implementation, stop that PR and report the exact conflict rather than guessing.

### 2. Preserve the user's worktree

- The shared workspace may be dirty and contains the planning documents. Never reset, clean, stash, or modify unrelated
  user changes.
- Prefer a separate git worktree for each PR under the approved temporary directory:
  `/private/var/folders/3z/2rhdvb1j52x4lrwqf68j3qyc0000gn/T/opencode/graph-prs/<PR_ID>`.
- Read planning documents from the shared workspace if they are not yet present on the branch.
- Create branches non-interactively with names such as `graph/s01-hash-laws` or `graph/q01-edge-walkers`.
- Base an independent PR on `origin/main`.
- If a PR has an unmerged predecessor and cannot be implemented independently, either stop at that merge gate or create
  an explicitly stacked branch based on the predecessor branch. Never pretend a stacked PR targets `main` cleanly.
- Do not amend commits and do not use destructive git commands.

### 3. Implement one PR ID at a time

- Follow Plan 14's exact PR boundary. Do not bundle adjacent IDs for convenience.
- Start with failing focused tests for behavior fixes and algorithm contracts.
- Make the smallest implementation that satisfies the approved contract.
- Reuse current CSR, snapshot, mutation, and Walker machinery; do not create competing representations.
- Keep shared helpers in the owner specified by Plans 12-14.
- Add no compatibility layer unless a shipped external contract requires it.
- Preserve automatic numeric IDs, sparse active indexes, loops, parallel edges, deterministic ordering, scoped mutation,
  and shallow payload semantics.
- New lazy iterables use iterator-time snapshot isolation and fresh state per iterator.
- Do not expose internal dense positions, CSR, caches, checkpoints, or mutable JSON models.

### 4. Public API requirements

For every additive public PR:

- Add runtime tests in a focused family file where practical instead of further enlarging `Graph.test.ts`.
- Add type tests covering data-first/data-last inference, mutable acceptance, exact graph-kind preservation, and
  wrong-kind rejection.
- Add repository-compliant JSDoc with applicability, ordering, loops/parallels, failures, complexity, and mutable
  snapshot behavior.
- Add one bounded deterministic runnable example where useful.
- Use `dual` conventions consistently with existing Graph APIs.
- Add exactly one focused changeset for the public family. Follow the repository's active additive release-level policy;
  if it is not inferable from current changesets, use the level approved by maintainers in the plans or stop and report.
- Run `pnpm codegen` only if modules are added or removed. Never hand-edit generated barrels.

For runtime behavior corrections, add one focused `effect` patch changeset. Tests/internal/docs-only PRs receive no
changeset unless repository policy requires one.

### 5. Validation

Run the narrowest applicable validation from repository root:

```sh
pnpm lint-fix
pnpm --filter effect test --run test/<affected-file>.ts
pnpm check
```

Add when applicable:

```sh
pnpm test-types Graph.tst.ts
pnpm lint
pnpm doctest --run packages/effect/src/Graph.ts
pnpm --filter effect test --run test/GraphProperty.test.ts
pnpm --filter effect test --run test/GraphDifferential.test.ts
pnpm circular
git diff --check
```

Never run:

- bare `pnpm test`
- bare `pnpm doctest`
- `pnpm runtimeperf*`
- benchmark commands or benchmark test files
- `pnpm bundle-compare`

If root `pnpm check` is blocked by unrelated workspace diagnostics, run the narrowest package check, capture the exact
unrelated failure, and report it in the PR. Do not alter unrelated files to make validation pass.

### 6. Commit and open the PR

- Review the final diff for generated files, accidental formatting churn, unrelated changes, and plan-scope drift.
- Commit only files belonging to the PR ID.
- Use a concise imperative commit subject.
- Push the branch and open the PR with `gh pr create`.
- Do not merge the PR.

PR title format:

`Graph: <concise capability or correction>`

PR body must include:

```md
## Summary

- <what changed>
- <important semantic decision>

## Plan

- PR ID: <ID>
- Depends on: <merged PR/branch or none>
- Deferred: benchmark/runtimeperf validation is intentionally out of scope for this cycle

## Validation

- `<exact command>`
- `<exact command>`

## Changeset

- <file and release level, or "Not required">
```

For stacked PRs, set the actual predecessor branch as the GitHub base and state how it will be retargeted after merge.

### 7. Continue or stop at the merge gate

- After opening a PR, record its URL, branch, base, commit, validation, and dependency status.
- Continue to the next independent PR in the selected group.
- Do not create a deep stack merely to finish the group. Stop when the next PR requires an unmerged semantic foundation
  and report the exact next action after merge.
- A maximum of two stacked PRs is allowed. Beyond that, stop at the merge gate.

## Group-specific cautions

### Stabilization

- S01 must land before S02; S02 before S03.
- S04 and S06 can proceed independently.
- S05 follows S04; S07 follows S06; S08 follows S07.
- Do not normalize self-loop storage in S07 unless a failing public/invariant test requires it.

### Verification

- V01 adds no production imports.
- V02 uses only the shared corpus.
- V03 adds Graphology only with the first hand-checked differential tests.
- Skip V04 entirely.

### Kernel

- K01-K04 are internal and have no changesets if behavior remains identical.
- Skip K05.
- K06 follows K04 and is an observable patch correction.
- Never leak compact edge positions into public APIs or typed arrays containing sparse public IDs.

### Emitters

- E01 changes tests only.
- E02 and E03 change output only for defects demonstrated by E01.
- No parser packages, output options, identifiers, attributes, strict DOT, hierarchy, or other formats.

### Queries

- Q01 proves edge-occurrence semantics before Q02.
- Do not add `sources` or `sinks`; use existing `externals`.
- Q04 exposes only `inducedSubgraph`.

### Generators

- G01/G02 stay synchronous.
- R01/R02 return Effect values and use `Random`; do not add seed options or a private PRNG.
- Run `pnpm circular` for R01/R02, but no bundle or benchmark commands.

### Connectivity

- Pin existing component/SCC ordering before adding consumers.
- C02 keeps bridges/articulation/biconnected results together around one low-link kernel.
- C03, C04, and C05 are separate PRs.

### Paths

- P01 keeps legacy `PathResult` unchanged.
- P02 is internal tie-predecessor groundwork with no changeset.
- Do not add eager `collect*` aliases or trivial path field accessors.
- Keep P03-P06 separate.

### Analytics

- Keep each public family separate.
- A04a is internal; A04b exposes closeness.
- Do not implement parked specialist analytics.

### MST

- Implement only minimum spanning forest/tree with stable input edge IDs.
- Do not add Euler, flow/cut, matching, or directed arborescence.

## Completion report

At the end of the invocation, report:

1. PRs opened, with URLs and dependency bases.
2. PR IDs completed, skipped as already implemented, or blocked.
3. Exact validation commands and outcomes for each PR.
4. Changesets created.
5. The next merge gate and recommended next agent invocation.
6. Any plan/source contradiction discovered.

Do not claim the whole Graph program is complete unless every non-excluded active PR in Plan 14 has merged.
```

## Suggested Invocation Order

Use separate agents in this order, allowing independent lanes to overlap after their prerequisites merge:

1. `stabilization`
2. `verification`
3. `kernel`
4. `emitters`
5. `queries`
6. `generators` and `connectivity` in parallel
7. `paths`
8. `analytics` and `mst` after their path/query prerequisites
9. `docs` after the shipped surface is frozen

Do not invoke benchmark/runtimeperf or Effect-native task groups in this cycle.
