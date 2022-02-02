// ets_tracing: off

import type * as Tp from "../../Tuple/index.js"
import type { Chunk } from "../definition.js"
import { zipWithIndexOffset_ } from "./zipWithIndexOffset.js"

/**
 * Zips this chunk with the index of every element, starting from the initial
 * index value.
 */
export function zipWithIndex<A>(self: Chunk<A>): Chunk<Tp.Tuple<[A, number]>> {
  return zipWithIndexOffset_(self, 0)
}
