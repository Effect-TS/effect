// ets_tracing: off

import * as Tp from "../../Tuple/index.js"
import * as Chunk from "../core.js"

/**
 * Returns two splits of this chunk at the specified index.
 */
export function splitAt_<A>(
  self: Chunk.Chunk<A>,
  n: number
): Tp.Tuple<[Chunk.Chunk<A>, Chunk.Chunk<A>]> {
  return Tp.tuple(Chunk.take_(self, n), Chunk.drop_(self, n))
}

/**
 * Returns two splits of this chunk at the specified index.
 *
 * @ets_data_first splitAt_
 */
export function splitAt(
  n: number
): <A>(self: Chunk.Chunk<A>) => Tp.Tuple<[Chunk.Chunk<A>, Chunk.Chunk<A>]> {
  return (self) => splitAt_(self, n)
}
