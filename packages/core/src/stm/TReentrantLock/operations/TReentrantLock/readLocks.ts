import { concreteTReentrantLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalTReentrantLock"

/**
 * Retrieves the total number of acquired read locks.
 *
 * @tsplus getter effect/core/stm/TReentrantLock readLocks
 */
export function readLocks(self: TReentrantLock): USTM<number> {
  concreteTReentrantLock(self)
  return self.data.get.map((_) => _.readLocks)
}
