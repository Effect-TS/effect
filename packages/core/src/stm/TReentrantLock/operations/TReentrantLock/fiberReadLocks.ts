import { concreteTReentrantLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalTReentrantLock"

/**
 * Retrieves the number of acquired read locks for this fiber.
 *
 * @tsplus getter effect/core/stm/TReentrantLock fiberReadLocks
 * @category getters
 * @since 1.0.0
 */
export function fiberReadLocks(self: TReentrantLock): USTM<number> {
  concreteTReentrantLock(self)
  return STM.Effect((journal, fiberId) => self.data.unsafeGet(journal).readLocksHeld(fiberId))
}
