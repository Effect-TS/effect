# Upstream cluster integration tests

Source: `Effect-TS/effect` main at
`072e35ae83c6fe5f41c9f01798e2582295d02434`, directory
`packages/platform/node/test/cluster-integration/`.
The v3 production base is PR #8195 at
`5448e8c688dfe6fa942d81b500245befb20f297b`.

This ports 106 applicable upstream cases. The eight excluded backend cases need
v4-only residency configuration or v4's strict JSON encoding of `Schema.Unknown`.
Test names retain the upstream scenario names so individual results can be
compared directly. The original 68 scenarios are unchanged from `1874e6f186`;
the completion adds 38 cases in separate files.

## Run and cleanup

Run from the repository root with Docker available:

```sh
nix develop -c pnpm install
nix develop -c pnpm exec vitest run --config packages/cluster/vitest.integration.ts
nix develop -c pnpm test run packages/cluster packages/workflow packages/rpc --maxWorkers 3
```

Append a filename or `-t 'scenario name'` to select cases. `--silent` suppresses
runner logs without changing assertions. The integration config is separate from
the default workspace, which excludes this directory. Tests and files run
sequentially because upstream fixtures share mutable gates and counters.

Global setup starts one `postgres:alpine` and one `mysql:lts` container. It stops
both after the run and stops PostgreSQL if MySQL startup fails. Testcontainers'
resource reaper remains enabled for abnormal process termination. Ports are
assigned by the OS; SQL table prefixes contain the worker PID and cluster index.
Each test closes runner, socket, workflow and database scopes. Tables disappear
with the containers. No external database or existing container is modified.

Runners execute in one process over real TCP sockets and shared SQL, as upstream
does. `kill` closes a runner's scope while suppressing storage deregistration,
explicit lock release, heartbeats and assignment refresh. Database-session
closure still releases advisory locks. This simulates abrupt runner loss; it is
not an OS process kill or a network partition.

## Source-to-v3 mapping

All paths in the first column are relative to the upstream directory above.
Destinations are in this directory. Each listed scenario runs on PostgreSQL and
MySQL; parameterized discard settings retain all four combinations.

| Source | Destination | Scenarios and retained assertions | Cases |
| --- | --- | --- | ---: |
| `Smoke.test.ts` | Same name, complete file | Three runners, persisted request before and after owner death, exact replies and two stored successes | 2 |
| `Workflow.test.ts` | Same name, all 13 scenarios | Concurrent execution returns 42 twice with one activity; completed activity replay remains once; full restart completion originates on another runner; race winner survives owner loss without rerunning the losing branch; compensation runs once and SuspendOnFailure remains suspended; late race completion crosses the suspension commit; retry attempts remain `[1,2,3]` and preserve the final typed error; durable clock waits at least 900 ms; durable queue survives restart and consumes once; interruption survives restart; synthetic activity handoff preserves acquire/release ordering, once-only execution and no compensation; safe interruption preserves compensation; actual owner handoff finishes with no pending messages | 26 |
| `Locks.test.ts` | Same name, complete file | Blackholed connection rebuild and rejoin; no reacquisition before forced release; peer progress with stuck lock query; repeated connection failures and hung release. Ownership cardinality and stable-assignment assertions retained | 8 |
| `Entity.test.ts` | Same name, selected scenarios | Unroutable durable reply during shutdown exits interrupted-only; outgoing finalizer discard succeeds for persisted/volatile and preemptive/non-preemptive combinations; slow registration retains exactly one pending request; absent registration stores exactly one defect | 14 |
| `Entity.test.ts` | `EntityLifecycle.test.ts`, all remaining scenarios | Fatal rebuild executes both in-flight attempts and builds exactly twice; forced handler interruption retries exactly twice; entity state isolation and exact mailbox order; saturation and fresh idle revival; addition/stop/death rebalance with no pending messages; frozen row-lock expiry; frozen advisory-lock retention; shard-group placement; singleton movement with maximum concurrency one; explicit resource release; prefix-isolated registration and routing | 19 |
| `Persistence.test.ts` | Same name, selected scenarios | Request sent while owner is down executes once; duplicate key returns stored reply after owner death; volatile discard is neither stored nor redelivered; discarded caller finishes while handler is blocked; typed failure and defect deduplicate while sibling request succeeds; stream acknowledgement survives shutdown; chunk round-trip; stream restart yields exactly `[0,1,2,3,4]`; terminal takeover yields exactly `[0]` and one terminal reply | 18 |
| `Persistence.test.ts` | `PersistenceLifecycle.test.ts`, all remaining compatible scenarios | Uninterruptible request replays after shutdown but completes once; invalid stored headers produce one defect without running the handler and a subsequent request succeeds; scheduled requests are absent before the deadline and execute once at or after it | 6 |
| `Transport.test.ts` | Same name, complete file | Directional socket cut leaves runner alive; volatile call retries exactly twice, persisted call executes once, both exact response values retained | 2 |
| `ClusterCron.test.ts` | Same name, complete file | Unique scheduled instants and recovery after error; previous-time/current-time scheduling; stale-run skip and catch-up across restart; singleton-owner failover without missing/duplicate ticks; singleton/execution shard-group placement. Original timing thresholds and schedule comparisons retained | 10 |
| `StreamDisconnect.test.ts` | Same name, complete file | Raw caller disconnects with no further messages; exactly one host handler starts and stops | 1 |
| `harness.ts`, `globalSetup.ts` | Same names | Upstream scoped socket/SQL topology, runner lifecycle, polling, SQL counts, fault injection and container setup, reduced to facilities used by these cases | n/a |

The old bespoke multi-process controller and worker are not used.

## V3 adaptations

- Imports use v3 packages. `Workflow.make({ name, ... })`, `Schema.TaggedError`,
  `RpcSchema.Stream({ success, failure })`, `Workflow.name`, schema type members
  and service `Type` replace their v4 forms. Workflow polling checks v3's
  `undefined | Result` instead of v4's `Option<Result>`.
- Upstream live tests acquire scopes implicitly. V3 uses `it.scopedLive`,
  `Effect.forkScoped`, `Layer.scoped`, `Scope.extend` and an explicit scope-fork
  execution strategy. The suite keeps real clocks, upstream 100 ms polling,
  15-second default deadlines and fixture-specific observation windows.
- TCP serialization uses v3 NDJSON. V3 has no `layerSchemaBinary`/`codecFor`
  transport contract. Exact decoded values, reply counts and stream order are
  retained; binary codec behavior is not covered.
- The raw disconnect case uses `Envelope.Request.PartialEncoded`,
  `Schema.encode` and `asMailbox`/`mailbox.take` in place of the v4 codec and raw
  queue. It closes the transport scope directly, without using the Sharding
  client's retry path. Transport socket tracking is opt-in so the original 68
  tests retain their original protocol layer.
- Freeze support is ported from upstream's storage controller: heartbeats and
  assignment refresh pause behind a gate, while sockets and the reserved
  connection stay open. Killing a frozen runner opens that gate without
  deregistration. Failure cleanup resumes frozen gates. Row-lock tests set v3's
  existing `shardLockDisableAdvisory` flag.
- Cron probes use v3 `Context.unsafeGet`, `Cron.unsafeParse` and DateTime's
  `unsafe*` constructors. `Effect.asVoid` adapts the tick recorder's boolean
  return to v3's void execution contract without changing recorded ticks. Its
  blocked-execution control still uses the boolean to identify the first run.
- Latches use `Effect.unsafeMakeLatch` and `open`/`unsafeOpen`. The activity
  handoff fixture records a boolean at the same point it opens the persistence
  latch because v3 has no `Latch.isOpen`.
- Synthetic activity abandonment uses v3's internal `ClusterAbandon.interrupt`
  followed by an interruptible never effect, matching the port's persisted-send
  path. It does not manufacture a typed error or successful completion.
- V3's durable queue uses `@effect/sql/SqlPersistedQueue.layerStore` and the
  experimental queue factory. The factory is imported by repository-relative
  path to avoid adding a production dependency to the cluster package.
- The typed-failure and defect RPCs use the default void success schema because
  v3's RPC success constraint rejects `Schema.Never`. Both handlers still always
  fail and both original failure assertions run twice.
- Polling also bounds a condition that itself waits on a latch. Failure clears
  injected lock faults before teardown. Gates blocking workflow finalizers are
  opened by cleanup registered after runner acquisition.
- Lock faults use a closed query gate instead of an irrevocable `Effect.never`.
  The query remains blocked until interruption or explicit `clear`; `clear`
  releases already-selected queries as well as future queries. In v3, masked
  reserved-connection acquisition can otherwise leave the test's own injected
  never effect waiting through scope closure. The hung-release gate remains
  separate. Faults are not cleared during any ownership assertion.
- Container startup is sequential with failure cleanup instead of upstream's
  `Promise.all`, which could leak the successful container if its peer failed.

## Exclusions

These limits are explicit; omitted tests are not counted as passing or replaced
by the existing module tests.

- `Residency.test.ts` requires v4's `maxResidentEntities` configuration and is
  excluded as v4-only.
- The three `Persistence.test.ts` cases using `Schema.Unknown` with an `Error`
  value depend on v4's strict JSON/schema encoding. V3 NDJSON does not reject
  that value the same way. They are excluded as written, rather than changing
  their payload to make a different test pass. Existing v3 module regressions
  cover malformed schema values and delivery of their persisted defect.
- All other upstream scenarios are now represented, including cron and raw
  caller-disconnect controls outside the original fix list. No compatible case
  is omitted merely because it was unfinished in the initial port.

## Completion validation

All 106 applicable cases ran once across six sequential foreground batches on
2026-09-17: **92 passed, 14 failed**, with no skips. Database validation started
at 06:23:51 UTC, after Architect's research task completed at 06:23:09 UTC and its
Vitest processes exited. Each batch owns and removes its own database containers.
The batch wall times include container startup and total 900.72 seconds; this is
not a claim of one uninterrupted full-suite run.

All batch commands start with:

```sh
nix develop -c pnpm exec vitest run --config packages/cluster/vitest.integration.ts
```

Append the selectors below and, to save the same evidence,
`--silent --reporter=default --reporter=json --outputFile.json=../../REPORT.json`.
The output path is relative to the config's package root and writes to the
repository root. Each row uses a different report name.

| Selectors | Report | Pass / fail | Wall time |
| --- | --- | ---: | ---: |
| `Transport.test.ts StreamDisconnect.test.ts PersistenceLifecycle.test.ts` | `complete-integration-small` | 8 / 1 | 89.75 s |
| `EntityLifecycle.test.ts` | `complete-integration-entities` | 12 / 7 | 149.49 s |
| `ClusterCron.test.ts` | `complete-integration-cron` | 8 / 2 | 129.05 s |
| `/Workflow.test.ts` | `complete-integration-workflow` | 24 / 2 | 239.02 s |
| `/Persistence.test.ts` | `complete-integration-persistence` | 18 / 0 | 192.71 s |
| `/Entity.test.ts /Locks.test.ts /Smoke.test.ts` | `complete-integration-original` | 22 / 2 | 100.70 s |

Failures retained without changes to assertions or deadlines:

- Nine report `All fibers interrupted without errors`: both original shutdown
  finalizer cases; PostgreSQL queue restart; forced handler interruption on both
  backends; frozen advisory-lock closure on both backends; MySQL frozen row-lock
  takeover; MySQL cron singleton-owner failover.
- Both entity rebalance cases report that the stopped runner did not hand over
  its entity within the original polling deadline. Diagnostics retain one
  unprocessed message and an unowned shard.
- PostgreSQL cron previous-time/current-time scheduling fails initial assignment
  stabilization, with one shard unowned and two messages pending.
- MySQL concurrent end-to-end workflow execution reaches the unchanged 60-second
  test timeout.
- The raw caller-disconnect case reports that the host handler did not stop after
  the caller died. The original start/stop assertions and direct transport-scope
  closure remain intact.

Architect's separate diagnosis at `1874e6f186` identified the extra abandonment
re-signal and v3 core finalizer FiberRef replay as two sources of interrupted
closes. Neither proposed production correction is applied here. The additional
failures above need individual attribution; matching error text alone does not
prove that every interruption has the same cause. No passing rerun replaces a
failed result in this report.

The existing cluster/workflow/RPC bundle passes **282/282**, 25 files, 197.93
seconds, with 59 SQL tests:

```sh
nix develop -c pnpm test run packages/cluster packages/workflow packages/rpc --maxWorkers 3 --silent --reporter=default --reporter=json --outputFile.json=complete-bundle-results.json
```

Root `lint-fix`, `check`, `build`, `docgen` and `git diff --check` pass. The five
original integration test files, production files and changeset are unchanged
from `1874e6f186`. The source port is complete for the compatible cases, but these
results are not a readiness claim.

## Historical validation of the initial 68-case port

Final full integration run: **64 passed, 4 failed**, 68 cases across five files,
389.58 seconds. Failing cases all report `All fibers interrupted without errors`:

- PostgreSQL and MySQL: unroutable durable reply from a shutdown finalizer.
- PostgreSQL: compensation and SuspendOnFailure after owner loss.
- MySQL: durable queue across full restart.

The shutdown-finalizer failure reproduced in both complete runs. Other
interruption failures moved between owner-loss/restart scenarios. The earlier
complete run had 62 passes and six failures, including a MySQL actual-activity
handoff polling timeout. Its deadline and assertions were not relaxed. These
results do not yet establish whether each failure requires a production fix or
another v3 lifecycle adaptation. In particular, v3's genuine interruption can
escape an `Effect.exit` in a masked finalizer; the upstream test assumes it can
assign the captured exit and return normally. Production remains unchanged for
separate diagnosis and implementation.

During harness development, the non-cancellable lock-fault injection hung
cleanup and foreground watchdogs terminated those runs. They are not passing
runs. After the clearable-query adaptation, all eight lock tests complete and
pass; the final suite exits normally and removes its containers.

The existing cluster/workflow/RPC bundle passes **282/282**, 25 files, 184.60
seconds, including 59 SQL tests. Root `lint-fix`, `check`, `build`, `docgen` and
`git diff --check` pass. No production file or changeset is changed. The tests
remain enabled in the opt-in project, including failures; there are no expected
failures or skips in that project.
