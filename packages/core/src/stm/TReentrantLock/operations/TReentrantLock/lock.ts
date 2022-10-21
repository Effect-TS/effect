/**
 * Just a convenience method for applications that only need reentrant locks,
 * without needing a distinction between readers / writers.
 *
 * See `TReentrantLock.writeLock`.
 * @tsplus getter effect/core/stm/TReentrantLock lock
 */
export function lock(self: TReentrantLock): Effect<Scope, never, number> {
  return self.writeLock
}
