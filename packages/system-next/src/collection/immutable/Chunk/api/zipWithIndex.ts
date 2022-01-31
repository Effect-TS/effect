import type { Tuple } from "../../Tuple"
import type { Chunk } from "../_definition"
import { zipWithIndexOffset_ } from "./zipWithIndexOffset"

/**
 * Zips this chunk with the index of every element, starting from the initial
 * index value.
 */
export function zipWithIndex<A>(self: Chunk<A>): Chunk<Tuple<[A, number]>> {
  return zipWithIndexOffset_(self, 0)
}
