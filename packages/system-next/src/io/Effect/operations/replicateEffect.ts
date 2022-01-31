import type { Chunk } from "../../../collection/immutable/Chunk/core"
import { Effect } from "../definition"

/**
 * Performs this effect the specified number of times and collects the
 * results.
 *
 * @tsplus fluent ets/Effect replicateEffect
 */
export function replicateEffect_<R, E, A>(
  self: Effect<R, E, A>,
  n: number,
  __etsTrace?: string
): Effect<R, E, Chunk<A>> {
  return Effect.suspendSucceed(() => Effect.collectAll(self.replicate(n)))
}

/**
 * Performs this effect the specified number of times and collects the
 * results.
 *
 * @ets_data_first replicateEffect_
 */
export function replicateEffect(n: number, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, Chunk<A>> =>
    replicateEffect_(self, n)
}
