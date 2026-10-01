# Native Redis throughput investigation

The release target is parity with `redis@5.0.1` across ordinary standalone,
reserved, Cluster, sequential, transaction, and binary workloads. The repeatable
comparison lives in `packages/redis/benchmark`; the reference installation stays
outside the workspace dependency graph. Performance work belongs to draft PR
https://github.com/Effect-TS/effect/pull/8638.

## Acceptance protocol

- Node 24.21.0, Intel Xeon Platinum 8272CL, Redis 7.2.6, loopback TCP,
  RESP2, identical fixture, credentials, keys, payloads, and command counts.
- Eight workloads: 128-command standalone/reserved pipelines, same-slot and
  multiple-slot Cluster pipelines, sequential requests, 128-command transactions,
  and 128-command binary GET/SET pipelines with 4 KiB payloads.
- A fresh Node process per implementation and observation, 500 ms warmup,
  common calibrated iterations targeting 3,000 ms, 19 paired rounds,
  alternating execution order. All processes and workloads run serially.
- Fixed chunks of 64 iterations bound retained binary replies to 32 MiB.
  Reply positions, every binary byte, acknowledgements, and final server counters
  are checked outside measured time. Setup and connections are outside timing;
  complete transaction executions are inside timing.
- Deterministic paired log-ratio bootstrap, 10,000 resamples, 95% confidence.
  Native/reference elapsed-time upper bound <= 1.05 establishes parity (explicit
  5% overhead margin). Lower bound > 1.05 is regression; crossing is inconclusive.
  `--require-parity` rejects any workload without established parity.
- Reports retain runtime/reference versions, settings, all calibration/pairs,
  Git HEAD, worktree hash, and hashes of tracked/untracked runtime source and
  harness. Source or harness mutation invalidates the whole run.
- Validate correctness before measuring; pause local tests/builds while measuring.
  Longer/more numerous pairs resolve borderline results; retain previous reports.

## Latest completed paired comparison, September 30, 2026

`tmp/runtimeperf/results/redis-parity-784071a66.json` records source at HEAD
`784071a66c11f0daaef1a5e4c6c6a6af2e7db71d` with the worktree fingerprint below.
It ran on Node 24.21.0, Linux 6.18.54, Intel Xeon Platinum 8272CL at 2.60 GHz,
and Redis 7.2.6,
against `redis@5.0.1`. Nineteen pairs per workload targeted 3,000 ms with a
500 ms warmup, a 5% margin, and 10,000 deterministic bootstrap resamples
(seed 1592594996) at 95% confidence. All observations and contract checks passed;
HEAD and all source/harness fingerprints remained stable. Seven of eight
workloads established parity, including binary SET. Sequential requests remain
inconclusive: the paired ratio is 1.050066 with a 95% interval of
0.995848–1.071013, crossing the 1.05 threshold. `--require-parity` exited 1; overall benchmark
acceptance remains incomplete.

| Workload                | Native commands/s | Reference commands/s | Paired elapsed ratio | 95% interval | Classification |
| ----------------------- | ----------------: | -------------------: | -------------------: | ------------ | -------------- |
| Standalone pipeline     |           436,051 |              274,136 |                0.635 | 0.612–0.642  | Parity         |
| Reserved pipeline       |           522,397 |              273,014 |                0.520 | 0.512–0.533  | Parity         |
| Cluster, same slot      |           274,696 |              180,965 |                0.657 | 0.644–0.681  | Parity         |
| Cluster, multiple slots |           215,827 |              176,133 |                0.836 | 0.804–0.866  | Parity         |
| Sequential              |            16,595 |               17,271 |                1.050 | 0.996–1.071  | Inconclusive   |
| Transactions            |           351,486 |              268,075 |                0.760 | 0.751–0.775  | Parity         |
| Binary GET              |           192,958 |              153,488 |                0.799 | 0.787–0.809  | Parity         |
| Binary SET              |           139,049 |              142,174 |                1.024 | 0.992–1.044  | Parity         |

The report retains these SHA-256 fingerprints:

| Artifact         | SHA-256                                                            |
| ---------------- | ------------------------------------------------------------------ |
| Runtime source   | `68e97c8619e015a758c42f84061b3faae74de87d73f4f24a5c7a8257dde9fb1c` |
| Worktree diff    | `ab727033299f4d49c55a8eebfe1bb2750ae472d078afb1c898656c42121ade3c` |
| Benchmark worker | `9c137dc22a4cae226cef0ae077b2350f7224cc1ebe63c522bf6fb9674179230a` |
| Coordinator      | `c89c6bfab03d554384ce7138900b8cc946ccc587d3f744f3d37e65f02703da06` |
| Bootstrap stats  | `75cc295130ac4cf3115611492d2ed89360b5ee69105a4b294ec26eb794c5dce2` |

## Matched admission optimization comparison

`tmp/runtimeperf/results/redis-matched-a63ab5ff9-2e3e4726c.json` records the
sequential workload against native Redis in two isolated committed worktrees:
base `a63ab5ff97863bf38c354e3f7374f2eef7d30cfd` and candidate
`2e3e4726c9a02d7b790372918fb973298e64a7c9`. It used the unchanged benchmark
worker in both checkouts, the same Redis 7.2.6 fixture, Node 24.21.0,
Linux 6.18.54, and Intel Xeon Platinum 8272CL at 2.60 GHz. Three resolution
guards ensured each checkout resolved its own Effect, Redis command, and Redis
client modules rather than workspace package links.

Thirteen serial alternating pairs used fresh processes, a 500 ms warmup,
250 ms calibration target, a 1,500 ms measurement target, and 23,527 common
iterations per observation. Every worker verified replies and final counters.
The deterministic 10,000-resample paired bootstrap (seed 1592594996) produced a
candidate/base elapsed-time ratio of **0.939367**, with a 95% interval of
**0.916050–0.966462**. Its upper bound below 1 establishes an improvement for
this source change. Median command throughput was 15,033 commands/s for base
and 15,519 commands/s for candidate. Source and harness stayed stable; the
fixture stopped and both temporary worktrees were removed after measurement.
This matched comparison measures the change; the full reference comparison
must separately establish release parity.

| Artifact               | SHA-256                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| Base runtime source    | `493c7c3fbfa69ecd1d77e123f24d5d3b7206998088d3f87e88d916bf63c751fb` |
| Candidate runtime      | `2035d26168cf3540db5656e070391f27be3054ce5297301027c3992d2b80c1ea` |
| Both clean diffs       | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Both benchmark workers | `9c137dc22a4cae226cef0ae077b2350f7224cc1ebe63c522bf6fb9674179230a` |
| Matched coordinator    | `8b9d787dc08ac44884d7bbbd9b30b5e2869eb315e06cfb595b9c9540e9edf0c9` |
| Bootstrap stats        | `75cc295130ac4cf3115611492d2ed89360b5ee69105a4b294ec26eb794c5dce2` |
| Fixture helper         | `a71fe3ae5b665185ab9a97870a11a9b16527efcdfe47ebdef61f00b7667daf7a` |

The original report and temporary coordinator remain at
`/tmp/effect-redis-matched-a63-2e3-p9pyTi/`; warmed CPU profiles remain at
`/tmp/effect-redis-a63-sequential-profile-KJjyrv/` as exploratory diagnostics.

## Writer scheduling candidate comparison

`tmp/runtimeperf/results/redis-sequential-4999664fd.json` records the
sequential-only reference screen for `4999664fd442caea791bf490815adfea52ffddff`.
Thirteen pairs targeting 1,500 ms with a 500 ms warmup produced a
native/reference ratio of 1.093 with a 95% interval of 1.020–1.112. The source
remained stable, but the interval crossed the 1.05 parity threshold, so the
screen was inconclusive and did not establish parity. The candidate was removed
at `7b289e71b`; its fairness regression test remains.

`tmp/runtimeperf/results/redis-matched-2e3e4726c-4999664fd.json` separately
compares native base `2e3e4726c9a02d7b790372918fb973298e64a7c9` with candidate
`4999664fd442caea791bf490815adfea52ffddff` in clean isolated worktrees.
Both use the unchanged worker and three verified local module-resolution guards.
The same Node 24.21.0, Linux 6.18.54, Xeon Platinum 8272CL, and Redis 7.2.6
environment ran 13 alternating serial fresh-process pairs, a 500 ms warmup,
250 ms calibration target, and a 1,500 ms measurement target, with 22,330 common
commands per observation. Every worker verified replies and final counters.

The deterministic 10,000-resample paired bootstrap (seed 1592594996) produced a
candidate/base elapsed-time ratio of **0.988654**, with a 95% interval of
**0.917373–1.051935**. This is **inconclusive** and does not support an
improvement from amortizing writer scheduling. Median command throughput was
15,790 commands/s for base and 15,645 commands/s for candidate. Source and harness
fingerprints remained stable; the fixture stopped, and both worktrees were
removed. All raw observations remain in the reports; the original matched report,
coordinator, setup, and resolution guards remain at
`/tmp/effect-redis-matched-2e3-next-EzQTAm/`.

| Artifact               | SHA-256                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| Base runtime source    | `2035d26168cf3540db5656e070391f27be3054ce5297301027c3992d2b80c1ea` |
| Candidate runtime      | `c3a2e2e7822db52ecb69cb8f4b64e01e51ac80c88dc8811bbff5f7f15c7f3c32` |
| Both clean diffs       | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Both benchmark workers | `9c137dc22a4cae226cef0ae077b2350f7224cc1ebe63c522bf6fb9674179230a` |
| Matched coordinator    | `2fa2ad26effa45fe067502da0e10e9646ae961a3052bebc7e1c3b60b9ea1b3f3` |
| Bootstrap stats        | `75cc295130ac4cf3115611492d2ed89360b5ee69105a4b294ec26eb794c5dce2` |
| Fixture helper         | `a71fe3ae5b665185ab9a97870a11a9b16527efcdfe47ebdef61f00b7667daf7a` |

## Integer parser and private completion comparison

`tmp/runtimeperf/results/redis-matched-2e3e4726c-784071a66.json` records native
base `2e3e4726c9a02d7b790372918fb973298e64a7c9` versus combined candidate
`784071a66c11f0daaef1a5e4c6c6a6af2e7db71d` in clean isolated worktrees. Both use
the unchanged benchmark worker, and three module-resolution guards verified each
checkout's own Effect, Redis command, and Redis client modules. The candidate
includes bounded complete-integer parsing and a private `Reply | RedisError`
completion callback; it retains the original writer scheduling.

The same Node 24.21.0, Linux 6.18.54, Xeon Platinum 8272CL, and Redis 7.2.6
environment ran 13 alternating serial fresh-process pairs, a 500 ms warmup,
250 ms calibration target, and a 1,500 ms measurement target. Every observation
used 21,068 common sequential commands and verified replies and final counters.
The deterministic 10,000-resample paired bootstrap (seed 1592594996) produced a
candidate/base elapsed ratio of **0.933629**, with a 95% interval of
**0.909175–0.967907**. The upper bound below 1 supports a sequential
improvement from these combined changes. Median command throughput was 15,966
commands/s for base and 16,651 commands/s for candidate. The comparison does not
isolate each change's contribution or establish reference parity; the candidate's
separate 19-pair reference screen remained inconclusive. That screen targeted
3,000 ms with a 500 ms warmup and produced ratio 1.034962, 95% interval
1.002272–1.081949, with all correctness checks and source stability passing.
Its report is `tmp/runtimeperf/results/redis-sequential-784071a66.json`.

Source and harness fingerprints remained stable; the fixture stopped and both
worktrees were removed. All raw observations remain in the report. The original
report, coordinator, frozen setup, and module-resolution guards remain at
`/tmp/effect-redis-matched-2e3-784-UvwZU5/`.

| Artifact               | SHA-256                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| Base runtime source    | `2035d26168cf3540db5656e070391f27be3054ce5297301027c3992d2b80c1ea` |
| Candidate runtime      | `68e97c8619e015a758c42f84061b3faae74de87d73f4f24a5c7a8257dde9fb1c` |
| Both clean diffs       | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Both benchmark workers | `9c137dc22a4cae226cef0ae077b2350f7224cc1ebe63c522bf6fb9674179230a` |
| Matched coordinator    | `2fa2ad26effa45fe067502da0e10e9646ae961a3052bebc7e1c3b60b9ea1b3f3` |
| Bootstrap stats        | `75cc295130ac4cf3115611492d2ed89360b5ee69105a4b294ec26eb794c5dce2` |
| Fixture helper         | `a71fe3ae5b665185ab9a97870a11a9b16527efcdfe47ebdef61f00b7667daf7a` |

## Retained comparisons and diagnostics

`tmp/runtimeperf/results/redis-parity-2e3e4726c.json` records source at HEAD
`2e3e4726c9a02d7b790372918fb973298e64a7c9`, runtime source hash
`2035d26168cf3540db5656e070391f27be3054ce5297301027c3992d2b80c1ea`.
Thirteen pairs targeting 1,500 ms with a 500 ms warmup established parity in
seven workloads; sequential requests regressed (1.090543, 1.070173–1.127271).
All worker checks passed, source remained stable, and `--require-parity` exited 1.

`tmp/runtimeperf/results/redis-parity-a63ab5ff9.json` records source at HEAD
`a63ab5ff97863bf38c354e3f7374f2eef7d30cfd`, runtime source hash
`493c7c3fbfa69ecd1d77e123f24d5d3b7206998088d3f87e88d916bf63c751fb`.
The same 13-pair, 1,500 ms target and 500 ms warmup protocol established parity
for seven workloads. Sequential requests were inconclusive (1.107,
1.046–1.125); source remained stable, all checks passed, and `--require-parity`
exited 1. The later matched source comparison supports improvement from this
checkpoint, while the full reference comparisons remain separate measurements.

`tmp/runtimeperf/results/redis-parity-dc5dc7d76.json` records clean committed
source at HEAD `dc5dc7d76bfea6746cafb11ab4a380bbb65213a0`, runtime source hash
`d06a1cbb033d6516dbeea60a31a1c21d614c77894494d8911b1b3118e3327c7e`.
With the same 13-pair, 1,500 ms target and 500 ms warmup protocol, six workloads
established parity; sequential requests (1.080, 1.063–1.128) and binary SET
(1.063, 1.052–1.096) regressed. All observations and contract checks passed,
source remained stable, and `--require-parity` exited 1.

`tmp/runtimeperf/results/redis-parity-ca3fcaec2.json` records clean committed
source at HEAD `ca3fcaec2243e6c37018ebe7c0701710438a915c`, runtime source hash
`56209a98aade14605c715ed032630e75eee11dd9296e965649ca950132ed230c`.
It used nine pairs targeting one second with a 250 ms warmup. Every observation
and contract check passed; source remained stable. The command
exited 1 because sequential requests regressed and both binary workloads were
inconclusive. Five workloads established parity.

Earlier paired checkpoints are retained in
`tmp/runtimeperf/results/redis-parity-native-fastpaths.json` and
`tmp/runtimeperf/results/redis-parity-optimized.json`. The original small five-pair
probe was exploratory and has been superseded by this repeatable acceptance
protocol; neither its timings nor diagnostic CPU profiles establish improvement.

`tmp/runtimeperf/results/redis-parity-typed-diagnostic.json` sampled three
workloads on later working source based on `ca3fcaec2`, runtime source hash
`d06a1cbb033d6516dbeea60a31a1c21d614c77894494d8911b1b3118e3327c7e`.
It used three paired rounds targeting 500 ms with a 250 ms warmup and the same
bootstrap method. Source and correctness checks passed. Sequential requests were
inconclusive (ratio 1.056, interval 1.010–1.117); binary GET and SET classified
as parity (0.833, 0.832–0.849 and 0.978, 0.902–1.032 respectively). The completed
eight-workload comparison supersedes these short observations; they neither
establish acceptance nor isolate the effect of individual changes.

## Current implementation and validation

Frozen runtime `784071a66c11f0daaef1a5e4c6c6a6af2e7db71d` retains direct
physical completion, standalone routing/admission paths, exact integer parsing,
immutable byte ownership, coalesced batch writes, and exclusive transaction
session reuse. Ordinary commands never share an active MULTI; concurrent
transactions acquire separate sessions, at most 16 idle sessions remain per
endpoint, and WATCH/stateful work uses fresh reservations. Failure or interruption
retires the affected lease.

`Transport.run(onBytes)` provides one scoped consumer of stable byte ranges.
Node dispatches directly from its data handler. Public parser input and custom
Duplex input are copied; private immutable transport ranges may be retained.
The write contract accepts UTF-8 strings, bytes, and ordered vectors with exact
wire-byte accounting. Repeated binary shapes share fixed spans; large inputs
share one private snapshot only for exact object identities within an invocation.
Node submits complete vectors under cork/uncork before waiting for drain.
The encoder and metadata caches each retain one entry independently, permitting
two distinct text frames of at most 4,096 wire bytes after intervening batches.
Every invocation checks current argument values and standalone endpoint fields.

Complete small integers use bounded lookahead; unsafe magnitudes, long headers,
fragmented frames, and invalid grammar use the exact signed-64-bit parser path.
Private `Reply | RedisError` completion avoids an intermediate Result allocation;
public Results, callbacks, decoding, deadlines, and package/transport contracts
remain unchanged. Decoder defects stay with their caller. The reverted writer
candidate is absent; the original per-batch yielding and fairness test remain.

All final correctness and package gates passed on frozen `784071a66`:

- Redis 7.2.6 and 8.10.2: 11 mandatory suites and 276 tests each, without skips.
- Root lint-fix, type checking, public JSDoc and public type checks; 135 focused
  runtime tests and nine core persistence tests.
- Exact Bun 1.4.0: nine native Redis suites and 153 tests without skips, including
  the three real-server integration suites on Redis 7.2.6. The verification
  report is `/tmp/native-redis-784071a66-manifest-verification.json`.
- Four fresh builds and tarballs: all eight public entrypoints and 17 declarations
  passed strict NodeNext consumption, including `stripInternal: true` output.
  The installation has only the Effect peer for `@effect/redis` and no external
  Redis client. Internal exports remain blocked.
- Compiled RESP2/RESP3 TCP smoke against Redis 8.10.2 passed Node 18.20.5,
  Node 24.21.0, Bun 1.4.0, and Deno 2.9.4. Coverage includes shared/distinct
  4 KiB vector pipelines, repeated Effects after input mutation, cork/`_writev`
  batching, small single-write pipelines, reserved sessions, transactions,
  Pub/Sub, persistence SCAN, and Lua/NOSCRIPT recovery. Current artifacts are
  `/tmp/effect-redis-integer-packed-wz510k/report.json`; previous packed reports
  remain under the admission, vector, and streaming checkpoint directories.

A prior optional Node transport suite under Bun passed 25/27. Two TLS tests
failed with `SSLV3_ALERT_HANDSHAKE_FAILURE`; a direct `node:tls` echo probe with
the same Ed25519 certificate reproduced the failure on Bun 1.4.0 without Redis
and succeeded on Node 24.21.0. Native-suite and TCP smoke success do not establish
complete Bun TLS coverage.

The completed eight-workload reference comparison on this frozen source used
19 paired rounds, a 3,000 ms target, and a 500 ms warmup. Seven workloads
establish parity; sequential requests remain inconclusive (1.050066,
0.995848–1.071013). All correctness and source-stability checks passed, but
`--require-parity` exited 1, so final performance acceptance remains incomplete.

These benchmarks cover one local CPU/runtime/server/protocol. TLS, remote latency,
RESP3, redirect-heavy migration, Sentinel failover, Pub/Sub, and replica reads
require separate performance measurements. Matched source comparisons support
claims about combined source changes; reference comparisons determine parity.

## Current sequential profiling diagnostics

`/tmp/effect-redis-784-sequential-profile/` retains the report, instrumented
worker, launcher, CPU/allocation profiles, exact timed-chunk boundaries, and
`summary.json` for frozen `784071a66`. Four serial fresh processes ran the same
sequential workload: native/reference CPU profiles followed by separate
native/reference allocation profiles. Each verified 60,000 commands after a
500 ms warmup on Node 24.21.0 and Redis 7.2.6. CPU sampling used 250 microseconds;
allocation sampling used 32 KiB and included objects collected by minor and
major GC. Runtime and original worker hashes remained stable, the fixture
stopped, and scratch probes were removed. These are exploratory diagnostics,
not paired throughput evidence or performance acceptance.

Within the timed-chunk CPU windows, native Redis self samples totalled 236.3 ms,
Effect 230.7 ms, transport 48.0 ms, and GC 65.2 ms. Parser `push` had 21.0 ms
inclusive and reservation classification 23.0 ms self. Writer wake had
1,153.6 ms inclusive, dominated by 970.6 ms in `writeUtf8String`; attributing
that whole stack to Effect would overstate its cost. Receive, settlement, typed
completion, and subsequent admission nest in the same synchronous stack, so
their inclusive costs overlap and must not be added. Sampling and boundary
clipping also retain attribution noise near the validation windows.

Allocation estimates after excluding directly identifiable validation stacks
were 4,559 bytes/command for native and 4,482 for reference. Async validation
allocations cannot all be separated by stack ancestry, so these are sampled
estimates rather than exact per-command allocation totals. Native callback and
yield runtime frames account for roughly 684 and 669 bytes/command respectively;
the prior bounded-yield candidate did not establish a matched improvement.
The current profile supports no new candidate with demonstrated material
benefit and acceptable semantic risk. Seven workloads establish parity;
sequential parity and final performance acceptance remain incomplete.
