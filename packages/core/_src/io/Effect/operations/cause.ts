/**
 * Returns an effect that succeeds with the cause of failure of this effect,
 * or `Cause.empty` if the effect did succeed.
 *
 * @tsplus getter effect/core/io/Effect cause
 */
export function cause<R, E, A>(
  self: Effect<R, E, A>
): Effect<R, never, Cause<E>> {
  return self.foldCause(identity, () => Cause.empty)
}
