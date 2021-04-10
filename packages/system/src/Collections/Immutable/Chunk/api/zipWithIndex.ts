import type { Chunk } from "../definition"
import { zipWithIndexOffset_ } from "./zipWithIndexOffset"

/**
 * Zips this chunk with the index of every element, starting from the initial
 * index value.
 */
export function zipWithIndex<A>(self: Chunk<A>): Chunk<readonly [A, number]> {
  return zipWithIndexOffset_(self, 0)
}
