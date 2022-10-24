import { concreteTReentrantLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalTReentrantLock"

/**
 * Determines if any fiber has a read lock.
 *
 * @tsplus getter effect/core/stm/TReentrantLock readLocked
 * @category getters
 * @since 1.0.0
 */
export function readLocked(self: TReentrantLock): USTM<boolean> {
  concreteTReentrantLock(self)
  return self.data.get.map((_) => _.readLocks > 0)
}
