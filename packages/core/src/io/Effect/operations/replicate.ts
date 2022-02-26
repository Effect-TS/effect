import { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../definition"

/**
 * Replicates the given effect `n` times.
 *
 * @tsplus static ets/EffectOps replicate
 */
export function replicate<R, E, A>(
  n: number,
  effect: LazyArg<Effect<R, E, A>>
): Chunk<Effect<R, E, A>> {
  return Chunk.range(0, n - 1).map(effect)
}

/**
 * Replicates the given effect `n` times.
 *
 * @tsplus fluent ets/Effect replicate
 */
export function replicateNow_<R, E, A>(
  self: Effect<R, E, A>,
  n: number
): Chunk<Effect<R, E, A>> {
  return replicate(n, self)
}

/**
 * Replicates the given effect `n` times.
 *
 * @ets_data_first replicateNow_
 */
export function replicateNow(n: number) {
  return <R, E, A>(self: Effect<R, E, A>): Chunk<Effect<R, E, A>> => self.replicate(n)
}
