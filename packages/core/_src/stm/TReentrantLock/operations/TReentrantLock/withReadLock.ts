/**
 * Runs the specified workflow with a read lock.
 *
 * @tsplus static effect/core/stm/TReentrantLock.Aspects withReadLock
 * @tsplus pipeable effect/core/stm/TReentrantLock withReadLock
 */
export function withReadLock<R, E, A>(
  effect: Effect<R, E, A>,
  __tsplusTrace?: string
) {
  return (self: TReentrantLock): Effect<R, E, A> =>
    Effect.uninterruptibleMask((_) =>
      _.restore(self.acquireRead.commit) > _.restore(effect).ensuring(
        self.releaseRead.commit
      )
    )
}
