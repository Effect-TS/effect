---
"@effect/workflow": minor
"@effect/cluster": minor
---

Fix child workflow fan-out inside activities so children dispatch before suspension, activity resources are released during durable waits, and child completions during cleanup wake the parent. Interrupted activity acquisition now releases its registration. Activities that suspend run again on replay; side effects before suspension must be idempotent.

Wake active workflow races when a durable deferred completes, preserving success-biased race behavior and branch transformations. Interrupted deferred attempts no longer persist an interruption as their result. The v3 engines share awaited deferred names with activity instances and retain pending completions for suspended executions until replay can read them, including the interval before the completion reply becomes durable.

Preserve workflow scopes across memory-engine suspension so all terminal finalizers run on completion. Deposit memory workflow interrupts after body finalizers and before workflow finalizers, retaining the interrupt across replay. V3 has no `interruptUnsafe` entry point; its existing deposited interrupt API keeps the durable interruption state until completion.

Honor numeric and bigint zero thresholds in `DurableClock.sleep`. Generated RPC and HTTP discard endpoints now declare and return the deterministic execution ID as a string.

Child resume messages use a child-specific key to avoid sharing an in-flight wake across different children. Previously persisted resume messages with empty payloads retain their empty key. The v3 reply waiter starts before reading storage and remains interruptible under its owning scope. Existing cluster abandonment behavior is preserved.
