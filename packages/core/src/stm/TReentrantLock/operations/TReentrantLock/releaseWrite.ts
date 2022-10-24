import { concreteTReentrantLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalTReentrantLock"
import { InternalWriteLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalWriteLock"
import * as Equal from "@fp-ts/data/Equal"

/**
 * Releases a write lock held by this fiber. Succeeds with the outstanding
 * number of write locks held by this fiber.
 *
 * @tsplus getter effect/core/stm/TReentrantLock releaseWrite
 * @category mutations
 * @since 1.0.0
 */
export function releaseWrite(self: TReentrantLock): USTM<number> {
  concreteTReentrantLock(self)
  return STM.Effect((journal, fiberId) => {
    const lock = self.data.unsafeGet(journal)
    let res: TReentrantLock.WriteLock | TReentrantLock.ReadLock

    if (
      lock instanceof InternalWriteLock &&
      Equal.equals(fiberId, lock.fiberId) &&
      lock.writeLocks >= 1
    ) {
      if (lock.writeLocks === 1) {
        res = TReentrantLock.ReadLock.apply(fiberId, lock.readLocks)
      } else {
        res = TReentrantLock.WriteLock(lock.writeLocks - 1, lock.readLocks, fiberId)
      }
    } else {
      throw new Error(`Defect: Fiber ${fiberId} releasing write lock it does not hold: ${lock}`)
    }

    self.data.unsafeSet(res, journal)

    return res.writeLocksHeld(fiberId)
  })
}
