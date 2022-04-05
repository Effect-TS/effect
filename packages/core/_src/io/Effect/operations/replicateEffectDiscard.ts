/**
 * Performs this effect the specified number of times, discarding the
 * results.
 *
 * @tsplus fluent ets/Effect replicateEffectDiscard
 */
export function replicateEffectDiscard_<R, E, A>(
  self: Effect<R, E, A>,
  n: number,
  __tsplusTrace?: string
): Effect<R, E, void> {
  return Effect.collectAllDiscard(self.replicate(n));
}

/**
 * Performs this effect the specified number of times, discarding the
 * results.
 *
 * @tsplus static ets/Effect/Aspects replicateEffectDiscard
 */
export const replicateEffectDiscard = Pipeable(replicateEffectDiscard_);
