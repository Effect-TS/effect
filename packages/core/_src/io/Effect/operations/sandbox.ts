/**
 * Exposes the full cause of failure of this effect.
 *
 * @tsplus fluent ets/Effect sandbox
 */
export function sandbox<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, Cause<E>, A> {
  return self.foldCauseEffect(Effect.failNow, Effect.succeedNow);
}
