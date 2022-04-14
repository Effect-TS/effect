/**
 * Returns an effect that succeeds with the cause of failure of this effect,
 * or `Cause.empty` if the effect did succeed.
 *
 * @tsplus fluent ets/Effect cause
 */
export function cause<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect.RIO<R, Cause<E>> {
  return self.foldCause(identity, () => Cause.empty);
}
