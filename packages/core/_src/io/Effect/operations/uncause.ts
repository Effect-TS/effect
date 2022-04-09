/**
 * When this effect succeeds with a cause, then this method returns a new
 * effect that either fails with the cause that this effect succeeded with, or
 * succeeds with unit, depending on whether the cause is empty.
 *
 * This operation is the opposite of `cause`.
 *
 * @tsplus fluent ets/Effect uncause
 */
export function uncause<R, E>(
  self: RIO<R, Cause<E>>,
  __tsplusTrace?: string
): Effect<R, E, void> {
  return self.flatMap((cause) => cause.isEmpty() ? Effect.unit : Effect.failCauseNow(cause));
}
