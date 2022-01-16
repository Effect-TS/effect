// ets_tracing: off

import * as C from "../../Collections/Immutable/Chunk"
import type { Effect } from "../definition"

/**
 * Replicates the given effect `n` times.
 */
export function replicate_<R, E, A>(
  self: Effect<R, E, A>,
  n: number
): C.Chunk<Effect<R, E, A>> {
  return C.map_(C.range(0, n), () => self)
}

/**
 * Replicates the given effect `n` times.
 *
 * @ets_data_first replicate_
 */
export function replicate(n: number) {
  return <R, E, A>(self: Effect<R, E, A>): C.Chunk<Effect<R, E, A>> =>
    replicate_(self, n)
}
