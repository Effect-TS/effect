---
"effect": patch
---

Add the experimental `Supervisor` module for observing fiber lifecycles. A Supervisor is called when each fiber starts, blocks, unblocks and ends, and is told what a blocked fiber waits on. Install one with `Effect.withSupervisor` or `Supervisor.layer`, and combine several with `Supervisor.combine`.

Also add a `blockedOn` option to `Effect.callback` that tells a Supervisor what the wait is on, `TestClock.stateUnsafe` for reading the pending test sleeps, and the guards `Latch.isLatch`, `Semaphore.isSemaphore`, `PartitionedSemaphore.isPartitionedSemaphore`, `TxRef.isTxRef` and `PubSub.isSubscription`.
