import type { Chunk } from "../../Collections/Immutable/Chunk"
import { range } from "../../Collections/Immutable/Chunk/api/range"
import { map_ } from "../../Collections/Immutable/Chunk/core"
import type { Effect } from "../definition"

/**
 * Replicates the given effect `n` times.
 */
export function replicate_<R, E, A>(
  self: Effect<R, E, A>,
  n: number
): Chunk<Effect<R, E, A>> {
  return map_(range(0, n), () => self)
}

/**
 * Replicates the given effect `n` times.
 *
 * @ets_data_first replicate_
 */
export function replicate(n: number) {
  return <R, E, A>(self: Effect<R, E, A>): Chunk<Effect<R, E, A>> => replicate_(self, n)
}
