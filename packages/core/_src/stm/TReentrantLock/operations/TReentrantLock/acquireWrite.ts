import { STMRetryException } from "@effect/core/stm/STM"
import { InternalReadLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalReadLock"
import { concreteTReentrantLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalTReentrantLock"
import { InternalWriteLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalWriteLock"

/**
 * Acquires a write lock. The transaction will suspend until no other fibers
 * are holding read or write locks. Succeeds with the number of write locks
 * held by this fiber.
 *
 * @tsplus getter ets/TReentrantLock acquireWrite
 */
export function acquireWrite(self: TReentrantLock): USTM<number> {
  concreteTReentrantLock(self)
  return STM.Effect((journal, fiberId) => {
    const lock = self.data.unsafeGet(journal)

    if (lock instanceof InternalReadLock && lock.noOtherHolder(fiberId)) {
      self.data.unsafeSet(TReentrantLock.WriteLock(1, lock.readLocksHeld(fiberId), fiberId), journal)

      return 1
    }

    if (lock instanceof InternalWriteLock && fiberId == lock.fiberId) {
      self.data.unsafeSet(TReentrantLock.WriteLock(lock.writeLocks + 1, lock.readLocks, fiberId), journal)

      return lock.writeLocks + 1
    }

    throw new STMRetryException()
  })
}
