---
"effect": minor
---

Add a `blockedOn` option to `Effect.callback`, which tells a Supervisor what the waiting fiber is blocked on; existing calls are unchanged.

Also add the experimental `Supervisor` module for observing fiber lifecycles. A Supervisor is called when each fiber starts, blocks, unblocks and ends, and is told what a blocked fiber waits on. Install one with `Effect.withSupervisor` or `Supervisor.layer`, and combine several with `Supervisor.combine`. This release also adds `TestClock.stateUnsafe` for reading the pending test sleeps, and the guards `Latch.isLatch`, `Semaphore.isSemaphore`, `PartitionedSemaphore.isPartitionedSemaphore`, `TxRef.isTxRef` and `PubSub.isSubscription`.
