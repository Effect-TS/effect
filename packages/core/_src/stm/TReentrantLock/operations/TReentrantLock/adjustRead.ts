import { STMRetryException } from "@effect/core/stm/STM"
import { InternalReadLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalReadLock"
import { concreteTReentrantLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalTReentrantLock"
import { InternalWriteLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalWriteLock"

/**
 * @tsplus fluent ets/TReentrantLock adjustRead
 */
export function adjustRead_(self: TReentrantLock, delta: number): USTM<number> {
  concreteTReentrantLock(self)
  return STM.Effect((journal, fiberId) => {
    const lock = self.data.unsafeGet(journal)

    if (lock instanceof InternalReadLock) {
      const res = lock.adjust(fiberId, delta)

      self.data.unsafeSet(res, journal)

      return res.readLocksHeld(fiberId)
    }

    if (lock instanceof InternalWriteLock && lock.fiberId == fiberId) {
      const newTotal = lock.readLocks + delta

      if (newTotal < 0) {
        throw new Error(`Defect: Fiber ${fiberId} releasing read locks it does not hold, newTotal: ${newTotal}`)
      }

      self.data.unsafeSet(TReentrantLock.WriteLock(lock.writeLocks, newTotal, fiberId), journal)

      return newTotal
    }

    throw new STMRetryException()
  })
}

/**
 * @tsplus static ets/TReentrantLock/Aspects adjustRead
 */
export const adjustRead = Pipeable(adjustRead_)
