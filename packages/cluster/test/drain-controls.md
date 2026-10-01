# Drain controls: pending remote-volatile correction

Base: `35493eb1af20cf35cb42d08d030d4f7e4832f747` (includes the merged v3 finalizer fix). Test-only follow-up for EFF-1345 / PR #8195, 2026-09-17.

## Coverage and source

`ShutdownDrain.test.ts` adapts Architect's six controls from the issue's `shutdown-drain-evidence.tar.gz` attachment (01a0ae5b-8260-7ae6-a3ab-ea6f17ea3fa1), adding remote stream drain/force cases, a pre-timeout persisted assertion and scoped cleanup. Eight cases use TestClock and real entity teardown. Drained streams deliberately emit no chunks so the assertion observes the terminal reply, not early consumer cancellation.

`RunnerReplyControls.test.ts` adds 28 terminal-reply classification controls and two routing-retry controls. Classification injects replies at the Sharding/storage boundary into real RunnerServer/RpcTest handlers. Unary and stream paths cover persisted/volatile replies, pure transient interrupts, caller-requested and unrelated interrupts, and sequential/parallel combinations with failure or defect. Non-routing replies must preserve the complete serialized reply.

The retry pair runs real caller-side `Sharding.sendOutgoing` through an in-memory Runners adapter to real RunnerServer handlers. First delivery responds with a transient interrupt; second responds successfully. Both assert two deliveries with the same request ID. This proves routing-loop re-execution, not TCP reconnection or physical owner transfer. Actual shutdown is covered separately by the drain cases. No PostgreSQL/MySQL tests or containers were started; no database slot was claimed.

## Discrimination

Only the narrow RunnerServer candidate from Architect was temporarily applied, then restored. It maps interrupt-only transient remote volatile replies to EntityNotAssignedToRunner for unary/stream calls. No Sharding/entityManager/core behavior was modified.

| Run | Passed | Failed |
| --- | ---: | ---: |
| New tests, baseline | 32 | 6 |
| New tests, candidate | 38 | 0 |
| Explicit non-container cluster/workflow/RPC bundle, baseline restored | 268 | 6 |
| Same bundle, candidate | 274 | 0 |
| Classification/retry suite, candidate without interrupt-only guard | 22 | 8 |

The six baseline failures are exactly the unary/stream forced remote drain cases, unary/stream volatile transient classification cases, and unary/stream actual routing retry cases. Existing 236 non-container module cases pass in both variants, including inherited local shard-loss and graceful-reassignment controls. Removing the interrupt-only guard fails all eight volatile mixed failure/defect cases. Pure caller interrupts and all persisted classification controls pass unchanged with the candidate.

Final production and changeset match the base byte-for-byte. Root `nix develop -c pnpm lint-fix`, `check`, `build`, `docgen`, and `git diff --check` pass on the restored production tree. The intentionally red regression tests stay enabled, without skips or expected-failure wrappers.

## Reproduction

Install from the root with `nix develop -c pnpm install`. Focused command:

`nix develop -c pnpm test run packages/cluster/test/ShutdownDrain.test.ts packages/cluster/test/RunnerReplyControls.test.ts`

The attached evidence contains the exact explicit bundle command, final baseline/candidate JSON and logs, mutation JSON, candidate patch, and validation logs. Apply that patch only in an isolated checkout to reproduce candidate results; restore it before committing tests. SQL suites were excluded by explicit file selection, not ambiguous CLI exclude filters.

## Pending implementation and compatibility

Production and the changeset still need a separate implementation run. Keep v3's full graceful timeout and local volatile caller interruption. Remote volatile routing retries may execute the handler again, with the same request ID; that side-effect/re-execution contract must be documented. Persisted reply handling and caller-requested/mixed failure/defect causes must not become routing retries.

The two upstream graceful-handover deadlines remain a known compatibility difference tied to main's handler-registration race; no timing threshold was changed. The out-of-scope raw-disconnect behavior and other integration failures are not addressed or revalidated here. The previous 106-case integration result remains 97 passed / 9 failed; this test-only handoff makes no readiness claim.

## New case results

| Case | Baseline | Candidate |
| --- | --- | --- |
| remote terminal reply classification unary, persisted=false: transient | failed | passed |
| remote terminal reply classification unary, persisted=false: caller interrupt | passed | passed |
| remote terminal reply classification unary, persisted=false: unrelated interrupt | passed | passed |
| remote terminal reply classification unary, persisted=false: sequential failure | passed | passed |
| remote terminal reply classification unary, persisted=false: parallel failure | passed | passed |
| remote terminal reply classification unary, persisted=false: sequential defect | passed | passed |
| remote terminal reply classification unary, persisted=false: parallel defect | passed | passed |
| remote terminal reply classification unary, persisted=true: transient | passed | passed |
| remote terminal reply classification unary, persisted=true: caller interrupt | passed | passed |
| remote terminal reply classification unary, persisted=true: unrelated interrupt | passed | passed |
| remote terminal reply classification unary, persisted=true: sequential failure | passed | passed |
| remote terminal reply classification unary, persisted=true: parallel failure | passed | passed |
| remote terminal reply classification unary, persisted=true: sequential defect | passed | passed |
| remote terminal reply classification unary, persisted=true: parallel defect | passed | passed |
| remote terminal reply classification stream, persisted=false: transient | failed | passed |
| remote terminal reply classification stream, persisted=false: caller interrupt | passed | passed |
| remote terminal reply classification stream, persisted=false: unrelated interrupt | passed | passed |
| remote terminal reply classification stream, persisted=false: sequential failure | passed | passed |
| remote terminal reply classification stream, persisted=false: parallel failure | passed | passed |
| remote terminal reply classification stream, persisted=false: sequential defect | passed | passed |
| remote terminal reply classification stream, persisted=false: parallel defect | passed | passed |
| remote terminal reply classification stream, persisted=true: transient | passed | passed |
| remote terminal reply classification stream, persisted=true: caller interrupt | passed | passed |
| remote terminal reply classification stream, persisted=true: unrelated interrupt | passed | passed |
| remote terminal reply classification stream, persisted=true: sequential failure | passed | passed |
| remote terminal reply classification stream, persisted=true: parallel failure | passed | passed |
| remote terminal reply classification stream, persisted=true: sequential defect | passed | passed |
| remote terminal reply classification stream, persisted=true: parallel defect | passed | passed |
| remote routing retry unary: Sharding retries a transient remote reply with the same request | failed | passed |
| remote routing retry stream: Sharding retries a transient remote reply with the same request | failed | passed |
| shutdown drain Persisted: a handler that completes before the termination timeout is drained and replied | passed | passed |
| shutdown drain Volatile: a handler that completes before the termination timeout is drained and replied | passed | passed |
| shutdown drain Volatile (local caller): a handler forced past the termination timeout interrupts the caller | passed | passed |
| shutdown drain Volatile (remote unary caller): drained before the timeout is replied | passed | passed |
| shutdown drain Volatile (remote unary caller): forced past the timeout yields a routing failure, not a terminal interrupt | failed | passed |
| shutdown drain Volatile (remote stream caller): drained before the timeout is replied | passed | passed |
| shutdown drain Volatile (remote stream caller): forced past the timeout yields a routing failure, not a terminal interrupt | failed | passed |
| shutdown drain Persisted: a handler forced past the termination timeout persists no terminal reply | passed | passed |
