/**
 * Releases a read lock held by this fiber. Succeeds with the outstanding
 * number of read locks held by this fiber.
 *
 * @tsplus getter effect/core/stm/TReentrantLock releaseRead
 */
export function releaseRead(self: TReentrantLock): USTM<number> {
  return self.adjustRead(-1)
}
