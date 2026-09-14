---
"@effect/cluster": minor
"@effect/workflow": minor
"@effect/rpc": patch
---

Fix cluster shutdown, routing, registration, persisted stream decoding, shard-lock recovery, and resource cleanup. Fix workflow replay after runner restart, deferred races, self-completion deadlocks, finalization ordering, and zero-duration clocks. Interrupted RPC stream writes now release waiting consumers.

Deferred completions wait for suspension replies before resuming discarded workflows. Unrelated completions do not occupy that wait, leaving mailbox capacity for the required completion. The v3 `DeferredState` API retains `pendingResult` and the `exit` argument to `deferredDone`; these differ from v4.

Persisted requests abandoned during teardown interrupt callers for replay; volatile requests and acknowledgements can fail with `EntityNotAssignedToRunner`. Abandonment also interrupts active workflow/activity owners, including from detached children. Workflow proxy discard calls return execution IDs. Suspended activities run again on replay, so side effects before suspension must be idempotent.

**Deployment:** Stop all runners before upgrading. PostgreSQL advisory locks now include storage prefixes; mixing protocols can give multiple runners the same shard. Runner notifications also change, so upgrade all peers together.
