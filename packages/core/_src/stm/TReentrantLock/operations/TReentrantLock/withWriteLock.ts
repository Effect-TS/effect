/**
 * Runs the specified workflow with a write lock.
 *
 * @tsplus fluent ets/TReentrantLock withWriteLock
 */
export function withWriteLock_<R, E, A>(
  self: TReentrantLock,
  effect: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.uninterruptibleMask((_) =>
    _.restore(self.acquireWrite.commit()) > _.restore(effect).ensuring(self.releaseWrite.commit(), __tsplusTrace)
  )
}

/**
 * Runs the specified workflow with a write lock.
 *
 * @tsplus static ets/TReentrantLock/Aspects withWriteLock
 */
export const withWriteLock = Pipeable(withWriteLock_)
