import { Effect } from "../definition"

/**
 * Performs this effect the specified number of times, discarding the
 * results.
 *
 * @ets fluent ets/Effect replicateEffectDiscard
 */
export function replicateEffectDiscard_<R, E, A>(
  self: Effect<R, E, A>,
  n: number,
  __etsTrace?: string
): Effect<R, E, void> {
  return Effect.collectAllDiscard(self.replicate(n))
}

/**
 * Performs this effect the specified number of times, discarding the
 * results.
 *
 * @ets_data_first replicateEffectDiscard_
 */
export function replicateEffectDiscard(n: number, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => replicateEffectDiscard_(self, n)
}
