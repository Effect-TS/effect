/**
 * Runs the specified workflow with a read lock.
 *
 * @tsplus fluent ets/TReentrantLock withReadLock
 */
export function withReadLock_<R, E, A>(
  self: TReentrantLock,
  effect: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.uninterruptibleMask((_) =>
    _.restore(self.acquireRead.commit()) > _.restore(effect).ensuring(self.releaseRead.commit(), __tsplusTrace)
  )
}

/**
 * Runs the specified workflow with a read lock.
 *
 * @tsplus static ets/TReentrantLock/Aspects withReadLock
 */
export const withReadLock = Pipeable(withReadLock_)
