# Native Redis throughput investigation

Original driver parity is complete. Further work targets improvements over
committed native Redis revisions, without loading or comparing another driver.
The native-only comparison and warmed profiler live in
`packages/redis/benchmark`; their method is documented in its `README.md`.
The completed original acceptance and earlier diagnostics below are historical
evidence. Performance work belongs to draft PR
https://github.com/Effect-TS/effect/pull/8638.

## Native revision comparison protocol

`RedisClient.ts` now compares committed native base/head revisions only.
Detached worktrees resolve their own Effect, Redis, Node, and Node-shared
modules. One canonical native-only worker is overlaid into each checkout;
the report records that overlay, harness revision/diff, and all source hashes.
No external driver is installed or loaded. All eight original operations,
keys, payloads, reply checks, and bounded 64-iteration chunks are preserved.

Fresh processes warm reusable state for 500 ms. Common calibrated iterations
target 1,500 ms by default, with 13 alternating paired rounds. Calibration is
excluded from the deterministic 10,000-resample paired log-ratio bootstrap.
At 95% confidence, an upper head/base ratio bound below 1 establishes an
improvement; a lower bound above 1 establishes regression; crossing 1 is
inconclusive. `--fail-on-regression` rejects classified regressions. Raw pairs,
exact settings, refs, module-resolution guards, stability, and cleanup status
remain in the report. Every measured reply and final stored value is checked
outside timing. Tests/builds stop before measurement; cases and workers run
serially. Source or harness changes invalidate a run.

Full eight-case validation and equal-ref smoke passed on
`b9d958400bd924190add20b41a51dd6d5e63941b`:
`tmp/runtimeperf/results/redis-native-validate-b9d958400.json` and
`tmp/runtimeperf/results/redis-native-smoke-b9d958400.json`.
The smoke uses two pairs, 100 ms targets, and 50 ms warmups, and supports
fixture/harness correctness only. Sources stayed stable; fixtures and
worktrees were removed. The native-only harness is committed at `b72c912d2`.

### Exploratory warmed profiles

`tmp/runtimeperf/results/redis-native-profile-b9d958400.json` and its five
`.cpuprofile` artifacts record the committed native baseline. Each fresh
process has a validated 1,000 ms warmup followed by 10 seconds of CPU sampling
at approximately 1 kHz. Setup, assertions, and final-state reads are excluded
from sampling. The profile retains the last bounded chunk; that chunk's replies
and the complete final stored state are verified afterward. Intermediate
profiled replies are not individually checked. Full unprofiled comparisons
check every reply instead. Source stayed stable and all resources closed.

| Workload     | Observed self-time hotspot                                   |
| ------------ | ------------------------------------------------------------ |
| Binary GET   | Parser push 11.65%; length parsing 2.27%; completeLine 1.73% |
| Binary SET   | prepareVectorSnapshots 8.03%; garbage collection 13.49%      |
| Pipeline     | submitUnsafe 5.71%; encodeFrames 3.11%; prepare 2.96%        |
| Transactions | Parser push 7.81%; transaction execute 5.64%                 |
| Sequential   | Idle 48.85%; native writeUtf8String 26.68%                   |

These percentages include idle time and are exploratory attribution, not
optimization effect sizes. Inspector overhead is visible; paired throughput
runs do not enable profiling. Caller stacks are retained in
`tmp/runtimeperf/results/redis-native-profile-b9d958400-stacks.json`.
They identify reply-header work, queue allocation, and vector construction
as candidates; sequential time is dominated by the socket path and idle time.

| Artifact           | SHA-256                                                            |
| ------------------ | ------------------------------------------------------------------ |
| Native worker      | `ad4a0864cd71815bcf6bc68486727bf03aaa6217c361b8b8c0c557ae2b3b721c` |
| Native coordinator | `6652b71e6437ba0062711f3685e8149bae11b7a55971876e582c8cbe35b6f529` |
| Baseline runtime   | `f7ddb6f6b9d4490d54c26e9723bb23cb773296423743c27a74998a6cd5653d57` |

### Native candidate comparisons

The isolated vector-reuse comparison
`tmp/runtimeperf/results/redis-native-matched-cd4988-072d680f8.json`
compares `cd4988ee23f1f16de5f286c7e6e912876fe8959f` with
`072d680f80549c55b1fc1e5e8cf3eadbc285e3e9` on binary SET. Thirteen alternating
pairs, 1,500 ms targets, 500 ms warmups, and 218,240 common commands per
observation produce ratio **0.958733** (95% interval **0.943620–0.982853**).
This supports approximately **4.1% lower paired elapsed time** for the encoding
change in that standalone-only fixture environment. It does not establish the
combined candidate's improvement over the earlier native baseline.

The first combined comparison
`tmp/runtimeperf/results/redis-native-matched-b9d958400-072d680f8.json`
compares `b9d958400bd924190add20b41a51dd6d5e63941b` with the same candidate.
It uses the same pair count, timing settings, worker, and machine, with both
standalone and Cluster fixtures selected. All 104 pairs verified replies,
counters, and binary bytes; source stayed stable and cleanup completed.

| Workload                | Head/base ratio | 95% interval      | Classification |
| ----------------------- | --------------: | ----------------- | -------------- |
| Standalone pipeline     |        0.979596 | 0.946489–1.007303 | Inconclusive   |
| Reserved pipeline       |        1.019038 | 0.988943–1.049911 | Inconclusive   |
| Cluster, same slot      |        0.997854 | 0.974318–1.009414 | Inconclusive   |
| Cluster, multiple slots |        1.032747 | 1.019642–1.045779 | Regression     |
| Sequential              |        1.025189 | 0.963363–1.060145 | Inconclusive   |
| Transactions            |        0.987537 | 0.947187–1.004809 | Inconclusive   |
| Binary GET              |        0.937874 | 0.934281–0.951914 | Improvement    |
| Binary SET              |        0.999684 | 0.991548–1.024432 | Inconclusive   |

The combined candidate establishes a binary GET gain but has a classified
multiple-slot Cluster regression; `--fail-on-regression` exited 1. It is not
accepted for publication. Native component comparisons will isolate the parser
and connection changes before retaining, removing, or revising them. No
contribution is attributed from the combined result alone. Both reports retain
all observations and must remain part of the evidence.

The two component comparisons use the same 13-pair, 1,500 ms target,
500 ms warmup protocol with both fixture topologies selected:

| Comparison          | Workload       | Head/base ratio | 95% interval      | Classification |
| ------------------- | -------------- | --------------: | ----------------- | -------------- |
| Baseline → parser   | Cluster, mixed |        0.999348 | 0.992284–1.018210 | Inconclusive   |
| Baseline → parser   | Binary SET     |        0.999749 | 0.987767–1.034906 | Inconclusive   |
| Parser → connection | Cluster, mixed |        0.979508 | 0.963560–1.034605 | Inconclusive   |
| Parser → connection | Binary SET     |        1.000147 | 0.984142–1.025882 | Inconclusive   |

Reports are `redis-native-diagnose-b9d958400-c798e32fe.json` and
`redis-native-diagnose-c798e32fe-cd4988ee2.json` under
`tmp/runtimeperf/results/`. All observations verified, source remained stable,
and all resources closed. Neither comparison reproduces or attributes the
original combined regression. They also do not establish a throughput benefit
from the connection allocation candidate.

At `badc17304`, `RedisConnection.ts` is restored exactly to the native baseline;
its queued-middle-cancellation contract test is retained. The parser and
within-invocation vector reuse remain. A final native comparison against
`b9d958400` preselects all eight workloads, 19 pairs, 2,000 ms targets,
and 500 ms warmups to assess the retained source with greater precision.
No earlier regression is relabeled or discarded.

The retained run also classifies reserved pipelines as a regression: ratio
1.032355, 95% interval 1.011924–1.040172. It is not accepted for publication.
The next source experiment restores the original integer dispatch before the
new bulk/simple-string paths. This is a code-layout hypothesis, not an
established attribution: the current dispatch already checks integers first.
Correctness review found no concrete defect in the retained parser or vector
changes. All native measurements and negative evidence remain retained.

The completed retained report is
`tmp/runtimeperf/results/redis-native-matched-b9d958400-badc17304.json`.
All 152 pairs verified replies and final state; sources stayed stable,
fixtures/worktrees closed, and cleanup recorded no errors. The regression
gate exited 1.

| Workload                | Head/base ratio | 95% interval      | Classification |
| ----------------------- | --------------: | ----------------- | -------------- |
| Standalone pipeline     |        0.997149 | 0.986673–1.029290 | Inconclusive   |
| Reserved pipeline       |        1.032355 | 1.011924–1.040172 | Regression     |
| Cluster, same slot      |        1.007717 | 0.985020–1.044301 | Inconclusive   |
| Cluster, multiple slots |        0.995942 | 0.978060–1.028059 | Inconclusive   |
| Sequential              |        1.041305 | 0.989974–1.083609 | Inconclusive   |
| Transactions            |        0.961371 | 0.937313–0.981208 | Improvement    |
| Binary GET              |        0.921239 | 0.904942–0.932465 | Improvement    |
| Binary SET              |        1.012001 | 0.992945–1.032148 | Inconclusive   |

At `e63d3ea93`, the original integer compound-if and completeInteger body
are restored verbatim. A following else-if handles the new bulk/simple-string
paths, preserving incomplete integer fallback. The next full eight-workload
comparison is preselected with the same 19 pairs, 2,000 ms target, and 500 ms
warmup. No causal claim follows from the dispatch layout alone.

### Completed native optimization pass

`tmp/runtimeperf/results/redis-native-matched-b9d958400-e63d3ea93.json`
compares native baseline `b9d958400bd924190add20b41a51dd6d5e63941b` with
retained source `e63d3ea936c5168f5db4a3c2b143acf7882462e8`. The environment is
Node 24.21.0, Redis 7.2.6, Linux 6.18.54, Xeon Platinum 8272CL, loopback TCP,
RESP2, with standalone and Cluster fixtures. The preselected full eight-case
matrix uses 19 alternating fresh-process pairs, a 2,000 ms target, 500 ms warmup,
and the unchanged deterministic 10,000-resample paired bootstrap at 95% confidence.

| Workload                | Head/base ratio | 95% interval      | Classification |
| ----------------------- | --------------: | ----------------- | -------------- |
| Standalone pipeline     |        0.996774 | 0.971768–1.016331 | Inconclusive   |
| Reserved pipeline       |        1.001090 | 0.960182–1.045370 | Inconclusive   |
| Cluster, same slot      |        1.007554 | 0.984013–1.022921 | Inconclusive   |
| Cluster, multiple slots |        1.002611 | 0.980388–1.009681 | Inconclusive   |
| Sequential              |        1.001904 | 0.983432–1.025091 | Inconclusive   |
| Transactions            |        0.954689 | 0.929760–0.979041 | Improvement    |
| Binary GET              |        0.939386 | 0.921502–0.949902 | Improvement    |
| Binary SET              |        0.956928 | 0.924463–0.973226 | Improvement    |

This supports approximately 4.5% lower transaction elapsed time, 6.1% lower
binary GET elapsed time, and 4.3% lower binary SET elapsed time for the combined
retained source. Five workloads remain inconclusive; none is classified as a
regression. `--fail-on-regression` exited 0. All 152 pairs (304 observations)
verified replies and final state; source/harness remained stable, fixtures and
worktrees were removed, and cleanup recorded no errors. The revised run does
not establish attribution for the earlier reserved or Cluster regressions.
All earlier reports remain intact. Results do not measure TLS, RESP3, remote
networks, failover, Pub/Sub throughput, or Bun/Deno performance.

| Artifact           | SHA-256                                                            |
| ------------------ | ------------------------------------------------------------------ |
| Native baseline    | `f7ddb6f6b9d4490d54c26e9723bb23cb773296423743c27a74998a6cd5653d57` |
| Retained runtime   | `06477427404429668bc12ccc8a463dac7fe3f8d56c6a3fb0c0eeec3acc1f93e1` |
| Native worker      | `ad4a0864cd71815bcf6bc68486727bf03aaa6217c361b8b8c0c557ae2b3b721c` |
| Native coordinator | `6652b71e6437ba0062711f3685e8149bae11b7a55971876e582c8cbe35b6f529` |

The retained changes avoid temporary arrays/strings for complete ordinary bulk
headers and exact common acknowledgements. Adjacent commands reuse a vector
only when their measured metadata and all owned binary snapshot identities
match within one invocation. The original integer dispatch and connection
writer are preserved. No public signatures or exports change.

Correctness checks passed on the measured runtime source:

- Root `pnpm lint-fix` and `pnpm check`, plus 101 focused tests in RedisClient,
  RedisConnection, and RedisProtocol. Logs: `/tmp/native-redis-integer-layout-*`.
- Redis 7.2.6 and 8.10.2: 11 mandatory suites and 282 tests each, no skips.
  Logs: `/tmp/native-redis-integer-layout-redis7.log` and `-redis8.log`.
- Actual Bun 1.4.0: five files and 111 tests, no skips.
- Actual Deno 2.9.4: 28 integration tests and explicit affected source/test
  static checking, no skips. Actual-runtime manifests and logs are under
  `/tmp/effect-redis-integer-layout-*`; owned fixtures were cleaned up.
- Independent read-only review found no substantive defects in retained
  runtime source, normal test organization, or the native comparison harness.

The previous six-package packed/strict/stripped checks remain evidence for the
preceding published checkpoint, not new-source packed validation. This pass
changes internal runtime implementations and tests without changing public
types, entrypoints, dependencies, or transport contracts. Hosted CI for the
new published commit is tracked in the draft PR.

## Original acceptance protocol (complete)

- Node 24.21.0, Intel Xeon Platinum 8272CL, Redis 7.2.6, loopback TCP,
  RESP2, identical fixture, credentials, keys, payloads, and command counts.
- Eight workloads: 128-command standalone/reserved pipelines, same-slot and
  multiple-slot Cluster pipelines, sequential requests, 128-command transactions,
  and 128-command binary GET/SET pipelines with 4 KiB payloads.
- A fresh Node process per implementation and observation, 500 ms warmup,
  common calibrated iterations targeting 3,000 ms, 29 paired rounds,
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

## Completed acceptance, October 1, 2026

`tmp/runtimeperf/results/redis-parity-e0f359e27.json` records frozen HEAD
`e0f359e27f23c6786f12127019ae93014cfbb47f`. All eight workloads establish
parity against isolated `redis@5.0.1`, and `--require-parity` exited 0.
The environment and acceptance margin above are unchanged: Node 24.21.0,
Redis 7.2.6, Linux 6.18.54, Xeon Platinum 8272CL, loopback TCP, RESP2,
29 alternating fresh-process pairs, 3,000 ms targets, and 500 ms warmups.
All replies, counters, and binary bytes passed verification. Source and harness
remained stable; fixtures, workers, and temporary worktrees were cleaned up.

| Workload                | Native commands/s | Reference commands/s | Paired elapsed ratio | 95% interval      |
| ----------------------- | ----------------: | -------------------: | -------------------: | ----------------- |
| Standalone pipeline     |           443,930 |              276,771 |             0.627123 | 0.612434–0.637657 |
| Reserved pipeline       |           518,084 |              271,067 |             0.521220 | 0.516366–0.528641 |
| Cluster, same slot      |           280,220 |              177,394 |             0.640398 | 0.608581–0.657055 |
| Cluster, multiple slots |           219,698 |              177,356 |             0.808817 | 0.797788–0.840554 |
| Sequential              |            17,741 |               17,623 |             0.982232 | 0.946523–0.996101 |
| Transactions            |           359,672 |              273,457 |             0.759247 | 0.749013–0.768642 |
| Binary GET              |           193,907 |              152,937 |             0.781784 | 0.769617–0.793553 |
| Binary SET              |           135,832 |              138,979 |             1.030023 | 1.007511–1.044111 |

Binary SET has approximately 3% elapsed overhead, within the unchanged 5%
margin. These results establish acceptance for this measured environment;
they do not measure TLS, RESP3, other runtimes, remote networks, or failover.

| Artifact         | SHA-256                                                            |
| ---------------- | ------------------------------------------------------------------ |
| Runtime source   | `f7ddb6f6b9d4490d54c26e9723bb23cb773296423743c27a74998a6cd5653d57` |
| Clean worktree   | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Benchmark worker | `9c137dc22a4cae226cef0ae077b2350f7224cc1ebe63c522bf6fb9674179230a` |
| Coordinator      | `c89c6bfab03d554384ce7138900b8cc946ccc587d3f744f3d37e65f02703da06` |
| Bootstrap stats  | `75cc295130ac4cf3115611492d2ed89360b5ee69105a4b294ec26eb794c5dce2` |

### Matched sequential improvement

`tmp/runtimeperf/results/redis-matched-3d1-e0f359e27.json` compares committed
base `3d1f7569f421a1fece88812ceddfbc4fe7f2d3ba` with the final candidate in
isolated worktrees. It uses the same environment, unchanged worker, 29 alternating
fresh-process pairs, 3,000 ms targets, 500 ms warmups, and 48,211 common
commands per observation. Seven module-resolution guards per checkout verify
that each worker uses its own package sources. All contract checks passed;
source stayed stable and both worktrees and the fixture were removed.

The head/base elapsed ratio is **0.942555**, with a 95% interval of
**0.895564–0.967508**: approximately **5.7% lower sequential elapsed time**
for the combined changes. Median throughput is 16,436 commands/s for base
and 17,447 for head. This does not isolate individual optimizations.
The changes reduce singleton pending/outgoing/inflight allocations, bound
command classification caching, and avoid asynchronous registration for idle
string writes while preserving accepted-write ownership and backpressure FIFO.

Base runtime SHA-256 is
`ece2ff5d75e40ef2be852636e3d26f2b26df58dd082e8ae43aa16f7adbf6c33a`;
candidate, worker, and stats hashes match the full reference run above.
The matched coordinator SHA-256 is
`c44c479ac99a154c401b625bf24d3afd4563a8702320218a226db8a2d70a76c4`.
Its archived source is
`tmp/runtimeperf/results/redis-matched-coordinator-e0f359e27.ts`.

### Retained intermediate measurements

Earlier matched reports remain in `tmp/runtimeperf/results/`:
`redis-matched-3d1-5e46948b1.json` (0.983, 0.941–1.049),
`redis-matched-5e46948b1-3babd6de1.json` (0.979, 0.969–1.007),
`redis-matched-3d1-3babd6de1.json` (0.964, 0.936–1.007), and
`redis-matched-3d1-72a1170b5.json` (0.980, 0.905–1.016).
Each is inconclusive for improvement; only the final combined comparison above
supports the current claim.

The 19-pair full run `redis-parity-72a1170b5.json` established parity in six
workloads, with sequential and binary SET inconclusive. Precision-only follow-ups
used 41 pairs, 5,000 ms targets, and only the standalone fixture, whereas full
runs also include a Cluster fixture. `redis-sequential-72a1170b5-41pairs.json`
remained inconclusive: ratio 1.02886655, interval 1.00023177–1.05040266;
its upper bound exceeds 1.05 and must not be rounded into a pass.
`redis-binary-set-72a1170b5-41pairs.json` established parity with ratio
1.01544074 and interval 1.01246521–1.03175353. The final full run supersedes
these acceptance statuses without changing their recorded classifications.

## Historical paired comparison, September 30, 2026

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
