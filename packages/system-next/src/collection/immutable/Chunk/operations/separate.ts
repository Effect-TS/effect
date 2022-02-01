import type { Either } from "../../../../data/Either"
import { identity } from "../../../../data/Function"
import type { Tuple } from "../../Tuple"
import type { Chunk } from "../definition"

/**
 * Partitions the elements of this chunk into two chunks.
 *
 * @tsplus fluent ets/Chunk separate
 */
export function separate<B, C>(self: Chunk<Either<B, C>>): Tuple<[Chunk<B>, Chunk<C>]> {
  return self.partitionMap(identity)
}
