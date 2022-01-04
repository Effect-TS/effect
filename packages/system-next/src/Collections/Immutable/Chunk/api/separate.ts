import type * as E from "../../../../Either"
import { identity } from "../../../../Function"
import type { Separated } from "../../../../Utils"
import type * as Chunk from "../core"
import { partitionMap_ } from "./partitionMap"

/**
 * Partitions the elements of this chunk into two chunks
 */
export function separate<B, C>(
  self: Chunk.Chunk<E.Either<B, C>>
): Separated<Chunk.Chunk<B>, Chunk.Chunk<C>> {
  return partitionMap_(self, identity)
}
