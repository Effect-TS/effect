---
"effect": patch
---

Improve Pool performance with a synchronous fast path for get and release.

`Pool.get` now leases an available item in a single step, without semaphore or
latch round-trips, and release finalizers are pre-allocated per item. The pool
tracks usage incrementally instead of scanning every item, keeps available
items in an intrusive FIFO list, and no longer forks background fibers for
no-op strategies or pools with `min: 0`.

The `Pool.State` and `Pool.PoolItem` interfaces changed to support this:
`State` loses `semaphore`, `availableLatch` and the numeric `waiters` counter,
gains `usage`, `availableHead`/`availableTail` and a `waiters` set of wake-up
callbacks. `PoolItem` gains intrusive-list and release fields.
