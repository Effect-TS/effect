/**
 * When this effect succeeds with a cause, then this method returns a new
 * effect that either fails with the cause that this effect succeeded with, or
 * succeeds with unit, depending on whether the cause is empty.
 *
 * This operation is the opposite of `cause`.
 *
 * @tsplus getter effect/core/io/Effect uncause
 */
export function uncause<R, E>(
  self: Effect<R, never, Cause<E>>
): Effect<R, E, void> {
  return self.flatMap((cause) => cause.isEmpty ? Effect.unit : Effect.failCause(cause))
}
