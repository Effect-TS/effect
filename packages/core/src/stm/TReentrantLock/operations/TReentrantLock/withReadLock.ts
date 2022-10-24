/**
 * Runs the specified workflow with a read lock.
 *
 * @tsplus static effect/core/stm/TReentrantLock.Aspects withReadLock
 * @tsplus pipeable effect/core/stm/TReentrantLock withReadLock
 * @category aspects
 * @since 1.0.0
 */
export function withReadLock<R, E, A>(effect: Effect<R, E, A>) {
  return (self: TReentrantLock): Effect<R, E, A> =>
    Effect.uninterruptibleMask((_) =>
      _.restore(self.acquireRead.commit) > _.restore(effect).ensuring(
        self.releaseRead.commit
      )
    )
}
