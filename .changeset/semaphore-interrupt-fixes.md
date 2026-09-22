---
"effect": patch
---

Fix a permit leak in `PartitionedSemaphore` and make transactional waiters interruptible.

- `PartitionedSemaphore.withPermits` took its permits while the fiber was interruptible and installed the release a step later. A fiber interrupted in between kept them: `available` dropped with nobody holding the permits, and every later `withPermits` on the semaphore waited forever. `withPermitsIfAvailable` had the same split. Both now take the permits and install the release in one uninterruptible step.
- `TxSemaphore.withPermit`, `withPermits` and `withPermitScoped`, and `TxReentrantLock.withReadLock`, `withWriteLock`, `readLock` and `writeLock` parked inside an uninterruptible acquire, so interrupting, timing out or racing a waiting fiber could not cancel it while the permit or lock stayed taken. The wait is now a separate read-only transaction, so a waiter can be cancelled, while taking the resource and installing its release stay one atomic step.
