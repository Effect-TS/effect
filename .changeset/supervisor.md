---
"effect": patch
---

Add `Supervisor`, an opt-in observer of fiber lifecycles: when each fiber starts, blocks, unblocks and ends, and what a blocked fiber waits on. Install one with `Effect.withSupervisor` or `Supervisor.layer`, and combine several with `Supervisor.combine`. Programs that don't use it pay no measurable run-time cost.

Also add `TestClock.stateUnsafe` for reading the pending test sleeps, and the guards `Latch.isLatch`, `Semaphore.isSemaphore`, `PartitionedSemaphore.isPartitionedSemaphore`, `TxRef.isTxRef` and `PubSub.isSubscription`.
