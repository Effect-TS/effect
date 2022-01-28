import { range } from "../../../collection/immutable/Chunk/api/range"
import type { Chunk } from "../../../collection/immutable/Chunk/core"
import { map_ } from "../../../collection/immutable/Chunk/core"
import type { Effect } from "../definition"

/**
 * Replicates the given effect `n` times.
 *
 * @ets fluent ets/Effect replicate
 */
export function replicate_<R, E, A>(
  self: Effect<R, E, A>,
  n: number
): Chunk<Effect<R, E, A>> {
  return map_(range(0, n - 1), () => self)
}

/**
 * Replicates the given effect `n` times.
 *
 * @ets_data_first replicate_
 */
export function replicate(n: number) {
  return <R, E, A>(self: Effect<R, E, A>): Chunk<Effect<R, E, A>> => replicate_(self, n)
}
