import { concreteTReentrantLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalTReentrantLock"

/**
 * Determines if a write lock is held by some fiber.
 *
 * @tsplus getter effect/core/stm/TReentrantLock writeLocks
 */
export function writeLocks(self: TReentrantLock): USTM<number> {
  concreteTReentrantLock(self)
  return self.data.get.map((_) => _.writeLocks)
}
