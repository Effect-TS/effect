import type { Tuple } from "../../Tuple"
import type { Chunk } from "../definition"

/**
 * Zips this chunk with the index of every element, starting from the initial
 * index value.
 *
 * @tsplus fluent ets/Chunk zipWithIndex
 */
export function zipWithIndex<A>(self: Chunk<A>): Chunk<Tuple<[A, number]>> {
  return self.zipWithIndexOffset(0)
}
