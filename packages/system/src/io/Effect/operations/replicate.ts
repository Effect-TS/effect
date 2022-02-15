import { Chunk } from "../../../collection/immutable/Chunk"
import type { Effect } from "../definition"

/**
 * Replicates the given effect `n` times.
 *
 * @tsplus fluent ets/Effect replicate
 */
export function replicate_<R, E, A>(
  self: Effect<R, E, A>,
  n: number
): Chunk<Effect<R, E, A>> {
  return Chunk.range(0, n - 1).map(() => self)
}

/**
 * Replicates the given effect `n` times.
 *
 * @ets_data_first replicate_
 */
export function replicate(n: number) {
  return <R, E, A>(self: Effect<R, E, A>): Chunk<Effect<R, E, A>> => self.replicate(n)
}
