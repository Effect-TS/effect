# Multi-runner integration test

From the repository root, with Docker available:

```sh
nix develop -c pnpm install
nix develop -c env EFFECT_CLUSTER_INTEGRATION=1 \
  EFFECT_CLUSTER_LOGS=../integration-results \
  pnpm test run packages/cluster/test/ClusterWorkflowEngine.integration.test.ts --maxWorkers 1
```

The test is opt-in. It starts an isolated PostgreSQL 16 container and three Node
runner processes, plus a separate client-only process. Application traffic uses
TCP with NDJSON serialization; IPC carries test commands and observations. Each
scenario gets a fresh database. The test closes its processes and container on
success or failure and retains logs, SQL failure snapshots, topology, timings and
individual assertion results in the output directory.

Each scenario submits 24 persisted requests, six persisted streams, six parent
workflows with three concurrent children each, and six deferred/activity races.
Three streams emit two elements before a gate; three remain pending until the
gate opens. Every successful stream must return exactly `0..7`. Children await
durable signals. Race signals arrive while the competing activity remains gated.

The default matrix repeats four scenarios three times:

- Steady operation.
- Graceful shutdown of an owner with pending requests and a held stream,
  reassignment to two runners, then restart and reassignment to three.
- The same sequence with `SIGKILL` instead of graceful shutdown.
- Stop all runners while durable work remains in PostgreSQL, then restart all
  three. The database and client stay up.

Each partition must cover all 12 shards without duplicates and give every live
runner a shard. PostgreSQL advisory locks and overlapping audited handlers are
sampled every 100 ms. Workflow polling must not report completion before release.
Result checks are independent so a stream failure does not hide workflow results.
Polling deadlines do not cancel durable workflow execution.

Startup is bounded to 30 seconds per process, assignment convergence to 45
seconds, graceful shutdown to 15 seconds, and forced cleanup to another five.
Request and stream observation allows 30 seconds after gate release; workflow
observation allows 60. The suite fails if a graceful stop needs forced cleanup.

Configuration:

| Variable | Default | Purpose |
| --- | --- | --- |
| `EFFECT_CLUSTER_PHASES` | `steady,graceful,crash,full-stop` | Comma-separated scenarios |
| `EFFECT_CLUSTER_REPEATS` | `3` | Repetitions, from 1 to 10 |
| `EFFECT_CLUSTER_WORKFLOWS` | `6` | Parent/race count, from 0 to 6; use 0 for storage controls |
| `EFFECT_CLUSTER_LOGS` | `multi-runner-results` | Evidence directory |
| `EFFECT_CLUSTER_WORKER_ROOT` | Current checkout | Checkout supplying the worker and runtime |

For a baseline comparison, create a detached checkout, install its dependencies,
and copy `multi-runner-worker.ts` into the same relative location there. Run this
suite from the PR checkout with `EFFECT_CLUSTER_WORKER_ROOT` set to the absolute
baseline checkout path. Record both revisions. Each invocation starts a fresh
database and cluster: never run old and new lock protocols against the same
storage. Upgrading an existing deployment requires stopping every old runner
before starting any new runner.

These tests establish observations for bounded local workloads. Sampling can miss
brief ownership overlap. They do not cover network partitions, database failure,
client restart, mixed-version rolling upgrades, sustained load, or every durable
stream/activity interaction. A timeout establishes a missed recovery deadline,
not permanent data loss.
