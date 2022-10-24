/**
 * Obtains a write lock in a scoped context.
 *
 * @tsplus getter effect/core/stm/TReentrantLock writeLock
 * @category getters
 * @since 1.0.0
 */
export function writeLock(
  self: TReentrantLock
): Effect<Scope, never, number> {
  return Effect.acquireRelease(
    self.acquireWrite.commit,
    (_) => self.releaseWrite.commit
  )
}
