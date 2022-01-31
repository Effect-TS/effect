import type * as E from "../../../../Either"
import { identity } from "../../../../Function"
import type * as Tp from "../../Tuple"
import type * as Chunk from "../core.js"
import { partitionMap_ } from "./partitionMap.js"

/**
 * Partitions the elements of this chunk into two chunks
 */
export function separate<B, C>(
  self: Chunk.Chunk<E.Either<B, C>>
): Tp.Tuple<[Chunk.Chunk<B>, Chunk.Chunk<C>]> {
  return partitionMap_(self, identity)
}
