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

## Compatibility implementation comparison

Base remains `ec831c3795b060ca6644cabdc0a8f62365f67af7`. The measured worktree
was `39e2b3f95103badcc67ae30151de12e5477167e9` plus only the `String.ts` fix,
subsequently committed as `08b4137a988021fe67ba507231e95a0bf29905ad`. Its recorded
diff hash is `baa1f2bb985cee9ff348905d8d6b63eed15357f794d2f5c74fae047d1989e905`.
The environment and bootstrap settings match the initial comparison. All workers
and fixture validations succeeded.

Increased the full-suite measurement to 21 paired rounds, 1,500 ms measurement
and 300 ms warmup:

| Case            | Base median | Head median | Paired delta | 95% interval       | Classification |
| --------------- | ----------- | ----------- | ------------ | ------------------ | -------------- |
| snake-to-camel  | 543.4 ns    | 537.4 ns    | -2.04%       | -3.07% to -0.59%   | inconclusive   |
| snake-to-pascal | 862.8 ns    | 854.3 ns    | -1.99%       | -5.73% to +2.47%   | inconclusive   |
| no-case         | 9.28 us     | 9.42 us     | +1.46%       | -1.86% to +9.02%   | inconclusive   |
| sql-rows        | 114.08 us   | 135.59 us   | +16.22%      | -11.88% to +28.42% | inconclusive   |

Because the noCase and SQL intervals remained wide, repeated each separately
with 31 paired rounds, 2,000 ms measurement and 500 ms warmup:

| Case     | Base median | Head median | Paired delta | 95% interval     | Classification |
| -------- | ----------- | ----------- | ------------ | ---------------- | -------------- |
| no-case  | 6.34 us     | 6.34 us     | +0.48%       | -3.55% to +6.88% | inconclusive   |
| sql-rows | 120.35 us   | 121.31 us   | +0.60%       | -5.31% to +4.76% | inconclusive   |

The follow-up SQL interval excludes a regression above the configured 5%
threshold, but all harness classifications remain inconclusive. The noCase
interval still permits a regression above 5%; these results do not establish
no degradation. All three raw reports are attached to the implementation handoff,
including the noisy first SQL result rather than discarding it.

Reproduce against the committed source:

```sh
nix develop -c pnpm runtimeperf-compare string-casing --base ec831c3795b060ca6644cabdc0a8f62365f67af7 --head 08b4137a988021fe67ba507231e95a0bf29905ad --rounds 21 --time 1500 --warmup-time 300
nix develop -c pnpm runtimeperf-compare string-casing/sql-rows --base ec831c3795b060ca6644cabdc0a8f62365f67af7 --head 08b4137a988021fe67ba507231e95a0bf29905ad --rounds 31 --time 2000 --warmup-time 500
nix develop -c pnpm runtimeperf-compare string-casing/no-case --base ec831c3795b060ca6644cabdc0a8f62365f67af7 --head 08b4137a988021fe67ba507231e95a0bf29905ad --rounds 31 --time 2000 --warmup-time 500
```
