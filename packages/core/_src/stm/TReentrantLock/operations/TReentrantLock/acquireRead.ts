/**
 * Acquires a read lock. The transaction will suspend until no other fiber is
 * holding a write lock. Succeeds with the number of read locks held by this
 * fiber.
 *
 * @tsplus getter effect/core/stm/TReentrantLock acquireRead
 */
export function acquireRead(self: TReentrantLock): USTM<number> {
  return self.adjustRead(1)
}
