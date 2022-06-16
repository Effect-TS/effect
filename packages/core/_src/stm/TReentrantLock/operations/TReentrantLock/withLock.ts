/**
 * Runs the specified workflow with a lock.
 *
 * @tsplus fluent ets/TReentrantLock withLock
 */
export function withLock_<R, E, A>(
  self: TReentrantLock,
  effect: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return self.withWriteLock(effect, __tsplusTrace)
}

/**
 * Runs the specified workflow with a write lock.
 *
 * @tsplus static ets/TReentrantLock/Aspects withLock
 */
export const withLock = Pipeable(withLock_)
