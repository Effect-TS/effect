/**
 * Runs the specified workflow with a lock.
 *
 * @tsplus static effect/core/stm/TReentrantLock.Aspects withLock
 * @tsplus pipeable effect/core/stm/TReentrantLock withLock
 * @category aspects
 * @since 1.0.0
 */
export function withLock<R, E, A>(effect: Effect<R, E, A>) {
  return (self: TReentrantLock): Effect<R, E, A> => self.withWriteLock(effect)
}
