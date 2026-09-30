# Redis client throughput

`RedisClient.ts` compares the native Node client with an isolated `redis@5.0.1` installation. The reference stays outside
the workspace dependency graph. Node 24 is required to run the TypeScript source directly. Install the reference once:

```sh
mkdir -p /tmp/effect-redis-reference
pnpm --dir /tmp/effect-redis-reference add redis@5.0.1 --save-exact
```

Run from the repository root on an otherwise idle machine:

```sh
REDIS_SERVER_BIN=/path/to/redis-server \
  node packages/redis/benchmark/RedisClient.ts \
  --reference-dir /tmp/effect-redis-reference --require-parity
```

Without `REDIS_SERVER_BIN`, the integration fixture searches `PATH` and then uses Docker. Docker's host networking
requires Linux. Both clients use the same fixture, Redis version, loopback transport and Node executable. The Cluster
fixture has three primaries and three replicas. Server startup, client connection, command construction and payload
construction happen outside timing. Transactions use the native watchless `RedisTransaction.execute` API and the
reference's `multi().exec()` API through their connected clients. Their complete transaction execution is timed.

The eight workloads cover a 128-command standalone pipeline, a reserved connection pipeline, same-slot and multiple-slot
Cluster pipelines, one-command sequential requests, 128-command transactions, and 128-command binary GET and SET pipelines
with 4 KiB values containing every byte. INCR replies must match their exact expected values in input order; counters are
checked after every warmup, calibration and measured run. Binary reads and final stored values must match every byte;
every SET must acknowledge `OK`. Both implementations retain the same output arrays for fixed chunks of at most 64
iterations (at most 32 MiB of binary reply bytes). Chunk elapsed times are accumulated into each observation; every reply
is validated after its chunk, and final stored state is checked after the complete run. Validation and conversion between
bigint and numeric replies occur outside timing. This bounds retained memory independently of the measurement duration.

Each observation runs in a fresh Node process and warms its reusable state for 250 ms. Calibration chooses one common
number of iterations for both clients, targeting at least one second for the faster client. Calibration samples are not
statistical observations. Nine measured pairs alternate native/reference execution order. Workers and cases never run
concurrently. JSON reports retain every paired observation, calibration samples, measurement configuration, versions,
resolved Git HEAD, working tree diff hash, and harness hashes under `tmp/runtimeperf/results/`. A sorted path/content hash
covers tracked and untracked runtime source files. The runtime, worker, coordinator and statistical helper hashes must
remain unchanged through the complete run; any change invalidates the report and fails the command.

The report uses the runtimeperf deterministic bootstrap of paired log elapsed-time ratios. A workload establishes parity
when its 95% upper confidence bound is at most `1.05`: the explicit target permits at most 5% native elapsed-time overhead.
A lower bound above `1.05` classifies regression; an interval crossing the threshold is inconclusive. Faster native
results also pass. `--require-parity` fails unless every selected workload establishes parity. `--fail-on-regression`
fails only for a classified regression. Without these flags, results remain diagnostic and benchmark failures still fail.
Cross-library results measure these public APIs and are not a portable ranking; source optimization claims additionally
require matched base/head measurements of the affected workload.

Select a workload or change measurement settings:

```sh
node packages/redis/benchmark/RedisClient.ts --reference-dir /tmp/effect-redis-reference \
  --case standalone-transactions128 --rounds 13 --time 1500 --warmup-time 500
```

A short fixture check validates the harness without establishing parity:

```sh
node packages/redis/benchmark/RedisClient.ts --reference-dir /tmp/effect-redis-reference \
  --rounds 2 --time 100 --warmup-time 50
```

Short runs and measurements collected while tests or other benchmarks are running cannot support acceptance claims. Keep
the same machine load, Node and Redis versions and all settings when comparing revisions. Repeat a borderline result
with more paired rounds and longer measurement time; retain the earlier report as part of the evidence.
