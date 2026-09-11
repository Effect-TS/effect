# Cluster v3 backport regression coverage

EFF-1347, stage 1 of EFF-1345. Shared branch: `backport/cluster-workflow-v3`.

This follow-up adds 41 tests and test fixtures. Production code is unchanged from implementation commit `ecdffcb8e24521e3c895244c934665958a148c2d`. The comparison baseline is test-only commit `2c2019d133dc633193435c10ff1b4ae76f059e8b`, based on v3 `1af4232fea7bc613e1dc68db9bec7b1f596d9e68`. Baseline runs use the same new test files in a separate checkout with baseline production source unchanged.

Paths below are relative to `packages/cluster/test/`. Earlier baseline results remain in the issue's original coverage attachment.

| PR | Coverage added or retained | Baseline / implementation |
| --- | --- | --- |
| #7032 | `ShutdownFollowup.test.ts`: finalizing entity calls a second entity, covering persisted/volatile, request/discard and both preemptive settings (8 cases). Retains the closed-Sharding matrix. | Seven new cases fail on baseline; one discard control passes. All eight pass on implementation. |
| #7134 | `ShutdownFollowup.test.ts`: persisted/volatile abandoned AckChunk errors. `EntityProxy.test.ts`: RPC and HTTP request errors round-trip through schemas; discard schemas reject routing/domain errors. | Four new failures on baseline; all pass on implementation. |
| #7485 | `WorkflowAbandonment.test.ts`: owner restart over shared storage, both SuspendOnFailure settings, no Complete/Suspended reply on abandonment, completed activity deduplication, compensation suppression, owner-local resource cleanup, durable finalizer on eventual completion, no parent resume, and a previously recorded durable interrupt winning over abandonment. `ShutdownFollowup.test.ts`: RPC cleanup while Sharding is alive must not journal cancellation. `StorageFollowup.test.ts` and `TeardownMarkers.test.ts`: waiter shutdown, marker identity, composed causes and ordinary interruption controls. | All six portable workflow/RPC/waiter cases fail on baseline and pass on implementation. The marker helper did not exist on baseline; its direct API test runs on implementation only. |
| #7489 | `NestedTeardown.test.ts`: nested persisted calls survive idle reap and caller registration-scope close while Sharding remains alive. `TeardownMarkers.test.ts`: overlapping entity/type/shard references and interruption cleanup. Retains the stale rebuild-fiber regression. | Two nested controls already pass on baseline. Two new registry-API tests run on implementation only. All pass on implementation. |
| #7018 | `RegistrationFollowup.test.ts`: memory and SQLite persisted rows survive slow registration; a never-registered entity gets the bounded fallback and eventually a defect reply. | Four new failures on baseline; all pass on implementation. |
| #7195 | `SocketDiscard.test.ts`: real TCP runner/client, handler remains blocked while volatile discard completes; injected first transport failure must retry and then deliver. Retains local discard and transport-error controls. | Two new failures on baseline; both pass on implementation. |
| #6972 | `StorageFollowup.test.ts`: malformed success and custom typed-error replies release parked waiters and persist a decodable defect. | Two new failures on baseline; both pass on implementation. |
| #7551 | `SqlLocksFollowup.test.ts`: a permanently stalled reserved query is cancelled; the empty probe uses the shared pool; subsequent lock refresh recovers within bounded retries. Retains existing Sharding lock-failover and reserved-connection recovery tests. | New empty-probe timeout on baseline; passes on implementation. |
| #7906 | `RegistrationFollowup.test.ts`: registration cannot replace runner-owned clock/config/reaper/generator. Retains explicit service override and caller-context isolation tests. | New protection control passes on both. |
| #7837 | Retains by-ID AckChunk reply-ID regressions for PostgreSQL, MySQL and SQLite. | Existing baseline failures; all pass on implementation. |
| #7860 | `SqlLocksFollowup.test.ts`: already-held lock acquisition and refresh return only requested shards, with unrelated locks on the same reserved connection. | New combined regression fails on baseline; passes on implementation. |
| #6798 | `SqlLocksFollowup.test.ts`: frozen signed/unsigned wire namespace values, including a UTF-8 prefix; foreign one-key and two-key locks remain untouched by shard release. Retains prefix isolation/exclusion tests. | Three frozen-vector failures plus the shared #7860 case on baseline; all pass on implementation. |
| #7039 | Retains failed ResourceRef acquisition scope cleanup, waiter failure, recovery and stale concurrent failure controls. | Existing baseline failure; implementation passes. |
| #7066 | Retains immediate failed ResourceMap lookup scope cleanup. | Existing baseline failure; implementation passes. |
| #7041 | `StreamFollowup.test.ts`: persisted success, persisted typed failure and volatile typed failure all emit WithExit and close the stream mailbox. Retains volatile success and malformed terminal controls. | Three new failures on baseline; all pass on implementation. |
| #7889 | Retains test-client fatal-defect true/false/omitted settings, typed failures and entity isolation. | Existing explicit-true baseline failure; implementation passes. |
| #7835 | `StorageFollowup.test.ts`: clearAddress removes AckChunk while preserving another entity's request. Retains queued Interrupt deletion. | New failure on baseline; passes on implementation. |
| #7038 | Retains primary-key reuse after clearAddress. | Existing baseline failure; implementation passes. |
| #7074 | Retains unhealthy registration and subsequent health update in memory. | Existing baseline failure; implementation passes. |

## Results

All commands run with `nix develop -c` from the relevant checkout. Dependencies were installed in both checkouts.

- New tests on baseline: 34 fail, 4 pass, 3 direct new-API tests are not applicable. The main baseline run reports 33 failures and 4 passes, with the permanently stalled-query case filtered out; that case separately fails at the empty liveness probe. The final durable-interrupt fixture separately fails its Complete-result assertion on baseline.
- New tests on implementation: 41 pass in focused runs.
- Full implementation run during harness development: 192 pass, 2 fail out of 194. One failure was the superseded durable-interrupt fixture; the other was the existing memory-engine `WorkflowEngine > nested workflows` case. The corrected workflow fixture and the isolated memory suite pass.
- Final non-SQL run: `pnpm test run packages/cluster/test packages/workflow/test --exclude '**/Sql*.test.ts'` passes all 133 tests in 24 files, including the corrected durable-interrupt fixture and the existing memory nested-workflow case.
- All 61 SQL tests pass in the broad run: 34 message-storage, 22 runner-storage, and 5 new lock tests. PostgreSQL, MySQL, SQLite and Vitess are covered.
- `pnpm lint-fix`, `pnpm check`, `pnpm build`, `pnpm docgen` and `git diff --check` pass. Production source and dependency files compare unchanged against the implementation commit.

The durable-interrupt fixture first records and processes the interrupt, then starts an attempt and injects abandonment once. It does not inject a permanent failure on every replay or assume a queued interrupt has already executed. The scenario runs in a child process with a startup deadline and a separate deadline after releasing abandonment; the parent collects its exit, so a stalled runtime cannot hang the test runner.

The permanent SQL partition uses `Effect.never` for queries already sent over a broken reserved connection. Restoring connectivity cannot make those queries finish. Recovery may retry while the replacement connection is acquired, matching the existing recovery contract.

## Remaining limits for independent review

- Workflow restart/replay uses sequential owner scopes over shared in-memory storage. It is not an overlapping multi-runner SQL ownership-transfer test. The TCP tests cover remote volatile discard and retry, not durable workflow transfer across sockets.
- Nested teardown covers idle reap and registration-scope close. Existing shard-failover tests cover shard release separately; their combination with a nested proxy has not been added.
- Existing Sharding failover tests and the storage probe tests cover recovery behavior. The unhealthy-probe warning text is not separately asserted.
- No full-stop deployment was performed. #6798 still requires stopping every old runner before starting the new prefix-namespaced advisory-lock protocol. Notify also changes its wire payload, so runner peers must be upgraded together.

The tests do not claim stage 2 coverage for #8070, #7840, #7179, #7000, #7350/#7351, #7428 or #8132. #7016 remains excluded. This issue does not own the final PR or release the stage barrier.
