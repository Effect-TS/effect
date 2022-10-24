/**
 * Obtains a read lock in a scoped context.
 *
 * @tsplus getter effect/core/stm/TReentrantLock readLock
 * @category getters
 * @since 1.0.0
 */
export function readLock(
  self: TReentrantLock
): Effect<Scope, never, number> {
  return Effect.acquireRelease(
    self.acquireRead.commit,
    (_) => self.releaseRead.commit
  )
}
