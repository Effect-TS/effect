import { concreteTReentrantLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalTReentrantLock"

/**
 * Retrieves the number of acquired write locks for this fiber.
 *
 * @tsplus getter effect/core/stm/TReentrantLock fiberWriteLocks
 */
export function fiberWriteLocks(self: TReentrantLock): USTM<number> {
  concreteTReentrantLock(self)
  return STM.Effect((journal, fiberId) => self.data.unsafeGet(journal).writeLocksHeld(fiberId))
}
