/**
 * Runs the specified workflow with a write lock.
 *
 * @tsplus static effect/core/stm/TReentrantLock.Aspects withWriteLock
 * @tsplus pipeable effect/core/stm/TReentrantLock withWriteLock
 */
export function withWriteLock<R, E, A>(
  effect: Effect<R, E, A>,
  __tsplusTrace?: string
) {
  return (self: TReentrantLock): Effect<R, E, A> =>
    Effect.uninterruptibleMask((_) =>
      _.restore(self.acquireWrite.commit) > _.restore(effect).ensuring(
        self.releaseWrite.commit
      )
    )
}
