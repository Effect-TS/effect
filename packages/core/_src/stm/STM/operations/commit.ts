/**
 * Commits this transaction atomically.
 *
 * @tsplus fluent ets/STM commit
 */
export function commit<R, E, A>(
  self: STM<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return STM.atomically(self)
}
