/**
 * Commits this transaction atomically.
 *
 * @tsplus getter effect/core/stm/STM commit
 */
export function commit<R, E, A>(self: STM<R, E, A>): Effect<R, E, A> {
  return STM.atomically(self)
}
