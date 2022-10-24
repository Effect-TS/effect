/**
 * Runs the specified workflow with a lock.
 *
 * @tsplus static effect/core/stm/TReentrantLock.Aspects withLockScoped
 * @tsplus getter effect/core/stm/TReentrantLock withLockScoped
 * @category aspects
 * @since 1.0.0
 */

export function withLockScoped(self: TReentrantLock) {
  return Effect.acquireReleaseInterruptible(
    self.acquireWrite.commit,
    self.releaseWrite.commit
  )
}
