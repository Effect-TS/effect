import { concreteTReentrantLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalTReentrantLock"

/**
 * Computes the number of write locks held by fibers.
 *
 * @tsplus getter effect/core/stm/TReentrantLock writeLocks
 */
export function writeLocks(self: TReentrantLock): USTM<number> {
  concreteTReentrantLock(self)
  return self.data.get.map((_) => _.writeLocks)
}
