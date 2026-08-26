---
name: runtime-performance
description: Runtime performance. Use for throughput or latency investigations, runtimeperf fixtures and comparisons, or legacy benchmark scripts.
---

Use `runtimeperf` for authoritative runtime base/head comparisons and focused
synchronous runtime regression fixtures. Use existing Tinybench scripts under
`benchmark/` for exploratory measurements when the structured harness does not
cover the behavior.

Do not infer an improvement from a single unpaired run. Validate behavior
independently before measuring, isolate one operation per fixture, and compare
the same fixture and environment across revisions.

## Runtimeperf

Read `packages/effect/runtimeperf/README.md` before changing the harness or
adding a fixture. For local optimization work, compare `HEAD` with the current
worktree so uncommitted changes are measured:

```sh
pnpm runtimeperf-compare <suite-or-case>
```

Use explicit `--base` and `--head` only to compare two committed refs.

Use `pnpm runtimeperf <suite-or-case>` for a focused local run. Runtime fixtures
must expose the documented synchronous `run` and `validate` contract, perform no
I/O, return no Promise, and measure one named operation. Construct cold-path
state inside `run`; construct steady-state state in the fixture factory.

After changing runtimeperf, run its focused tests and formatting checks as
documented in its README.

Report whether the comparison head was the worktree or a Git ref.

## Tinybench

Match nearby scripts when extending an existing `benchmark/` directory. Keep
setup outside the measured callback unless setup is the operation under test,
warm reusable state before measurement, close resources after `bench.run()`,
and print the Tinybench table. Treat these scripts as exploratory unless a task
explicitly defines a repeatable comparison protocol.
