# String casing baseline

Compare casing and the SQL result-name transform without database I/O:

```sh
nix develop -c pnpm runtimeperf-compare string-casing --base origin/main --head worktree --rounds 9 --time 500 --warmup-time 150
```

For a pinned comparison, replace `origin/main` with
`ec831c3795b060ca6644cabdc0a8f62365f67af7` and `worktree` with the intended commit.
The harness materializes the same fixtures on both revisions, validates their
results, and alternates base/head execution order in fresh Node processes.

The casing cases measure a batch of five representative column names, not one
string. The SQL case measures 100 rows including nested objects. Setup is outside
the timed callback. Inputs use ordinary names that succeed on both revisions;
underscore compatibility and formerly throwing inputs belong in runtime tests.

## Initial comparison

Base: `ec831c3795b060ca6644cabdc0a8f62365f67af7` (`main`).
Head: `3fe7cf839efe21743502b7552d24ef3c90ac5a6c` (PR #9183) plus these fixtures and
test-only changes; implementation unchanged. Measured on Linux x64, Intel Xeon
Platinum 8573C, Node 26.7.0 / V8 14.6.202.34-node.28, Tinybench 6.2.1.

Nine paired rounds, 500 ms measurement and 150 ms warmup per worker, 10,000
bootstrap iterations (seed 1592594996), 5% regression threshold:

| Case            | Base median | Head median | Paired delta | 95% interval      | Classification |
| --------------- | ----------- | ----------- | ------------ | ----------------- | -------------- |
| snake-to-camel  | 530.7 ns    | 555.2 ns    | +3.90%       | +2.27% to +7.91%  | inconclusive   |
| snake-to-pascal | 664.6 ns    | 668.6 ns    | +0.98%       | -0.45% to +2.14%  | inconclusive   |
| no-case         | 5.96 us     | 6.27 us     | +3.42%       | +0.32% to +10.93% | inconclusive   |
| sql-rows        | 96.42 us    | 102.82 us   | +3.07%       | +0.58% to +13.43% | inconclusive   |

All rounds and fixture validations succeeded. These results establish a baseline,
not proof of performance parity: the intervals for camel conversion, noCase and
SQL transforms still allow regressions greater than 5%. Repeat after the separate
implementation pass. The raw JSON report is attached to the EFF-2171 handoff.
