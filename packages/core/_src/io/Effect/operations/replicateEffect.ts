/**
 * Performs this effect the specified number of times and collects the
 * results.
 *
 * @tsplus fluent ets/Effect replicateEffect
 */
export function replicateEffect_<R, E, A>(
  self: Effect<R, E, A>,
  n: number,
  __tsplusTrace?: string
): Effect<R, E, Chunk<A>> {
  return Effect.suspendSucceed(Effect.collectAll(self.replicate(n)))
}

/**
 * Performs this effect the specified number of times and collects the
 * results.
 *
 * @tsplus static ets/Effect/Aspects replicateEffect
 */
export const replicateEffect = Pipeable(replicateEffect_)
