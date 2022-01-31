// ets_tracing: off

import type * as E from "../../../../Either/index.js"
import { identity } from "../../../../Function/index.js"
import type * as Tp from "../../Tuple/index.js"
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
