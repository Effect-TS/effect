import { concreteTReentrantLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalTReentrantLock"

/**
 * Retrieves the number of acquired read locks for this fiber.
 *
 * @tsplus getter ets/TReentrantLock fiberReadLocks
 */
export function fiberReadLocks(self: TReentrantLock): USTM<number> {
  concreteTReentrantLock(self)
  return STM.Effect((journal, fiberId) => self.data.unsafeGet(journal).readLocksHeld(fiberId))
}
