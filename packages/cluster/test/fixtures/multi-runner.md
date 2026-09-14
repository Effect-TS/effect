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

Restarted stream handlers continue after `request.lastSentChunkValue`, following
the existing `TestEntity.ts` fixture. The runtime resumes reply sequencing; the
handler uses the saved value to resume its application sequence. Both stream
groups retain their gate when resumed.

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

Validation for [PR #8195](https://github.com/Effect-TS/effect/pull/8195) used test
tip `b21c32c892657fcf50661d6008ba987c21333b3d`, with production last changed at
`868849cb58596141a3655d7aa9d2420c3e4640b2`. Commands, logs and diagnostic
instrumentation are attached to EFF-1345. Earlier failures remain part of the
record:

| Revision / run | Result |
| --- | --- |
| `aefc51e4be`, original matrix | 2/12 cases passed; 66/72 parents completed and 24/72 streams passed. SQL stream decoding and parent recovery failed. |
| `868849cb58`, old stream fixture | 6/12 cases passed; all parents recovered, but repeated stream prefixes left 57/72 exact-value passes. |
| `b21c32c892`, corrected fixture | 11/12 cases passed; all 288 requests, 72 parents, 72 races and 72 exact streams passed. One full-stop case failed the handler audit. Full-stop recovery took 7.342–9.320 seconds. |
| Additional isolated full-stop controls | 3/3 passed; recovery took 7.359–11.846 seconds. |
| Independent replication at `b21c32c892` | Steady and full-stop, twice each: 4/4 passed; 193 samples found no ownership violations, final partitions held 12 locks, and no unprocessed message groups remained. Full-stop recovery took 7.6–8.2 seconds. |

Independent validation also passed the 285-test cluster/workflow/RPC bundle
(opt-in integration skipped), type checking and cluster/workflow lint. A separate
34-case diagnostic run passed 30 cases. Four cases under six competing CPU loads
missed the unchanged 45-second partition-convergence deadline, including one in
the smaller-pool batch. At least one failed before workload submission. No
ownership violations were observed in 4,875 samples; convergence under CPU
contention remains a limitation.

The diagnostics reproduced an inherited `@effect/sql-pg` cancellation race.
Cancellation uses the shared pool and can wait up to five seconds. The original
connection can return to the pool before its queued `pg_cancel_backend` runs,
allowing cancellation to kill an unrelated query on the reused connection
(SQLSTATE `57014`). A deterministic reproduction triggered the race 3/3, and an
independent repeat confirmed it. An instrumented eight-connection run caught cancellation
killing an audit finalizer and leaving its row open. The backport leaves sql-pg
unchanged, but stronger interruption during teardown may increase exposure;
the baseline comparison does not quantify that risk. A sql-pg fix remains a
separate follow-up.

This mechanism and the original handover timeline make stale audit cleanup a
well-supported explanation for the original failure, rather than directly proven
attribution: that run had no per-handler exit or cancellation instrumentation.
The audit treats an open row on a live process as an active handler, so failed
cleanup can look like overlap. It excludes exited processes and can miss their
failed cleanup. Its 100 ms sampling can also miss brief ownership overlap.

The original steady-run snapshot retained four losing-race activity rows.
Those activities remain uninterruptible on the server and can finish after the
workflow result. All 34 diagnostic cases found zero residual rows after results
and after drainage checks, with observed drain times of 0–2 ms. This supports
transient drainage in those runs; a single snapshot or successful workflow result
does not establish complete cleanup for all workloads.

Baseline comparison at v3 `1af4232fea7bc613e1dc68db9bec7b1f596d9e68` was partial
because baseline startup and reassignment also failed. It identified inherited
SQL decoding and cancellation behavior, but did not establish a passing baseline
for the full matrix or exclude every regression. Pending deferred completions can
also remain in memory until a terminal local run or engine disposal; owner churn
can extend this retention when no terminal run occurs locally.

These are bounded local observations, not a production-safety guarantee. The
suite does not cover network partitions, database failure, client restart,
mixed-version rolling upgrades, sustained production load, or every durable
stream/activity interaction. A timeout establishes a missed recovery deadline,
not permanent data loss. The full-stop deployment requirement above still applies.
