# Native Redis performance

Run from the repository root with Node 24 or newer. The benchmark compares native clients at two committed revisions,
without installing or loading another Redis driver:

```sh
REDIS_SERVER_BIN=/path/to/redis-server node packages/redis/benchmark/RedisClient.ts \
  --base <baseline-commit> --head <candidate-commit> --fail-on-regression
```

The coordinator creates detached worktrees and links only their own Effect, Redis, Node and Node-shared workspace
packages. It overlays its canonical `RedisClientWorker.ts` into both so the operation remains identical even when the
benchmark changed since the baseline. Reports record the canonical source, overlay path, worker/coordinator/fixture/stats
hashes, harness Git HEAD and diff hash. Runtime sources retain their committed contents; only the worker overlay may
differ from HEAD. Resolution guards verify that the worker, Node facade and shared transport load their own modules.

Verify every workload before measuring:

```sh
REDIS_SERVER_BIN=/path/to/redis-server node packages/redis/benchmark/RedisClient.ts --head <commit> --validate
```

This runs two iterations after warmup, validates every reply and final stored state, and makes no performance claim. An
equal-ref run exercises calibration, pairing and reporting:

```sh
node packages/redis/benchmark/RedisClient.ts --base <commit> --head <same-commit> \
  --rounds 2 --time 100 --warmup-time 50
```

All eight workloads remain selectable: `standalone-pipeline128`, `standalone-reserved-pipeline128`,
`cluster-same-slot-pipeline128`, `cluster-multiple-slots-pipeline128`, `standalone-sequential`,
`standalone-transactions128`, `standalone-binary-get128`, and `standalone-binary-set128`. Binary values contain every byte
and are 4 KiB each. Repeat `--case <name>` to select a subset.

Without `REDIS_SERVER_BIN`, the fixture searches PATH and then uses Docker. Docker host networking requires Linux. Only
selected topologies start: standalone uses one Redis server; Cluster has three primaries and three replicas. Reports
record selected cases and topologies. Both revisions share Redis version, fixture, loopback transport and Node executable.
Startup, connection, command construction and payload construction occur outside timing.

Each observation uses a fresh process with 500 ms warmup by default. Calibration chooses a common iteration count
targeting 1500 ms for the faster revision and is excluded from statistics. Thirteen pairs alternate base/head order.
`--rounds`, `--time` and `--warmup-time` override these defaults. Workers and cases never run concurrently.

Both revisions retain replies in fixed chunks of at most 64 iterations, bounding binary bytes at 32 MiB. Chunk elapsed
times accumulate into the observation. Every ordered INCR reply, binary read and SET acknowledgment is validated after
its chunk, outside timing. Final counters and binary values are checked after warmup, calibration and every observation.
Reports retain raw samples, refs, settings and sorted runtime source hashes under `tmp/runtimeperf/results/`. Source,
worker, module resolution and harness hashes must remain unchanged; changes invalidate the report. Fixtures and temporary
worktrees close in `finally`, including failure and interruption paths, with cleanup status recorded.

The deterministic runtimeperf bootstrap analyzes paired head/base log elapsed-time ratios with 10,000 resamples at 95%
confidence. An upper bound below 1 establishes improvement; a lower bound above 1 establishes regression; an interval
containing 1 is inconclusive. `--fail-on-regression` fails on classified regression. Fixture, worker, configuration,
stability and cleanup errors always fail. Use exact report bounds, since table values are rounded.

Finish correctness checks and freeze sources before measuring on an otherwise idle machine. Preselect workloads and
settings; preserve earlier evidence when increasing precision. Short runs or runs concurrent with tests, builds or other
benchmarks cannot support optimization claims.

## Warmed CPU profiles

Profiles are exploratory diagnostics, separate from throughput comparisons:

```sh
REDIS_SERVER_BIN=/path/to/redis-server node packages/redis/benchmark/RedisClient.ts --head <commit> --profile \
  --case standalone-sequential --case standalone-pipeline128 \
  --case standalone-binary-get128 --case standalone-binary-set128 \
  --warmup-time 1000 --profile-time 10000 --sampling-interval 1000 \
  --output tmp/runtimeperf/results/redis-native-profile.json
```

Sampling starts after validated warmup, at approximately 1 kHz by default. Setup, assertions and final-state reads are
outside the profile. The worker executes 64-iteration chunks and retains only the latest. After sampling stops, it checks
that chunk's replies and the complete final stored counters or binary values. Intermediate profiled replies are not
individually validated; fixture checks and unprofiled comparisons validate every reply. Retained memory remains bounded.

Every workload uses a fresh process and saves a `.cpuprofile` beside the JSON report. The report records the profile hash,
sampling configuration and leading self-time frames. Inspect caller stacks to distinguish client, protocol and transport
work from Effect scheduling, Node I/O, garbage collection and idle time. Normal output-array allocation and the chunk loop
remain in the profile. Validate a proposed optimization with unprofiled paired base/head comparisons.
