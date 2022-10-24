/**
 * Determines if any fiber has a read or write lock.
 *
 * @tsplus getter effect/core/stm/TReentrantLock locked
 * @category getters
 * @since 1.0.0
 */
export function locked(self: TReentrantLock): USTM<boolean> {
  return self.readLocked.zipWith(self.writeLocked, (read, write) => read || write)
}
