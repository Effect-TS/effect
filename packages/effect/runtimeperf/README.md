# Effect Runtime Performance

This harness measures focused synchronous runtime paths in fresh Node
processes. It supports:

- a broad Effect Schema survey;
- contextual comparisons with TypeBox, Valibot and Zod 4 standard;
- paired comparisons between Git revisions or the current working tree.

Cross-library results are diagnostic. Effect base/head comparisons are the
authoritative measurement for source changes.

## Commands

Run the complete registry:

```sh
pnpm runtimeperf
```

Select a suite, fixture, shared scenario, tier, family or implementation:

```sh
pnpm runtimeperf schema
pnpm runtimeperf object-32-valid
pnpm runtimeperf schema/object-32-valid-effect
pnpm runtimeperf --tier 0
pnpm runtimeperf --family arrays
pnpm runtimeperf --implementation zod4
pnpm runtimeperf --implementation typebox
```

Override measurement settings:

```sh
pnpm runtimeperf object-32-valid --rounds 9 --time 500 --warmup-time 150
```

Compare Effect `HEAD` with the working tree:

```sh
pnpm runtimeperf-compare schema/object-32-valid-effect
```

Compare explicit refs:

```sh
pnpm runtimeperf-compare schema --base main --head HEAD
```

Only `--fail-on-regression` turns a statistically classified regression into a
non-zero comparison exit code. Worker, fixture, configuration and Git errors
always fail.

Reports are written under `tmp/runtimeperf/results/`. Temporary Git worktrees
are created under `tmp/runtimeperf/worktrees/` and removed in `finally`.

## Registry

`config.json` groups fixture cases by source file. Every case records:

- tier and family;
- covered Effect AST tags;
- operation and path;
- input size;
- implementation;
- a shared scenario name for cross-library comparisons.

Tier 0 contains at least one Effect fixture for every current `SchemaAST.AST`
variant. Higher tiers cover common scaling, cross-cutting behavior, adapters,
cold paths and an application-shaped schema.

The `zod4` implementation always imports `zod/v4` and calls `safeParse` with
`{ jitless: true }`; neither Zod's generated object fast path nor
`zod/v4-mini` is used. Valibot comparisons use pre-created `safeParser`
functions. Effect uses `SchemaParser.decodeUnknownExit`, whose failures contain
`SchemaIssue` directly. The public `Schema` adapters that wrap issues in
`SchemaError` are measured separately in the adapter family and are not used
for cross-library ratios.

TypeBox comparisons use `Value.Errors`, which performs exhaustive dynamic
validation and returns structured errors. They do not import `typebox/schema`,
call `Schema.Compile`, or use TypeBox's JIT compiler. The application-shaped
fixture is excluded from the TypeBox comparison because it includes a decode
transformation with no equivalent operation in `Value.Errors`.

## Measurement model

Each worker validates the fixture before measuring. Calibration finds a batch
large enough for the configured target duration. Implementations in the same
scenario use the largest proposed batch and execute in separate processes with
rotating order.

Tinybench measures one synchronous batched task. The primary process result is:

```text
nsPerOp = totalTimeMs * 1_000_000 / (task.runs * batchSize)
```

Tinybench latency statistics are retained as diagnostics and normalized by the
batch size. Independent Node processes, not Tinybench samples, are the
statistical observations.

Base/head comparisons alternate execution order by round and analyze paired
log ratios with a deterministic bootstrap. The report keeps all raw worker
results so aggregates can be recalculated.

## Fixture contract

Each configured export is a factory:

```ts
type RuntimePerfCase = {
  readonly run: () => unknown
  readonly validate: (result: unknown) => void
}

type RuntimePerfCaseFactory = () => RuntimePerfCase
```

Construct schemas, steady-state adapters and deterministic inputs in the
factory. Cold fixtures deliberately construct them inside `run`. A fixture
must measure one named operation, perform no I/O and return no Promise.

## Validation

```sh
node --test packages/effect/runtimeperf/test/*.test.mts
pnpm exec dprint check package.json packages/effect/runtimeperf
```
