import { concreteTReentrantLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalTReentrantLock"

/**
 * Determines if a write lock is held by some fiber.
 *
 * @tsplus getter effect/core/stm/TReentrantLock writeLocked
 * @category getters
 * @since 1.0.0
 */
export function writeLocked(self: TReentrantLock): USTM<boolean> {
  concreteTReentrantLock(self)
  return self.data.get.map((_) => _.writeLocks > 0)
}
