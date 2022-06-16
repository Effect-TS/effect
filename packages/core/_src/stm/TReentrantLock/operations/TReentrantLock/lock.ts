/**
 * Just a convenience method for applications that only need reentrant locks,
 * without needing a distinction between readers / writers.
 *
 * See [[ets/TReentrantLock writeLock]].
 * @tsplus fluent ets/TReentrantLock lock
 */
export function lock(self: TReentrantLock, __tsplusTrace?: string): Effect<Scope, never, number> {
  return self.writeLock(__tsplusTrace)
}
