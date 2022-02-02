import type { Either } from "../../../../data/Either"
import { Tuple } from "../../Tuple"
import { Chunk } from "../definition"

/**
 * Partitions the elements of this chunk into two chunks using the specified
 * function.
 *
 * @tsplus fluent ets/Chunk partitionMap
 */
export function partitionMap_<A, B, C>(
  self: Chunk<A>,
  f: (a: A) => Either<B, C>
): Tuple<[Chunk<B>, Chunk<C>]> {
  let bs = Chunk.empty<B>()
  let cs = Chunk.empty<C>()

  self.forEach((a) => {
    const x = f(a)
    if (x._tag === "Left") {
      bs = bs.append(x.left)
    } else {
      cs = cs.append(x.right)
    }
  })

  return Tuple(bs, cs)
}

/**
 * Partitions the elements of this chunk into two chunks using the specified
 * function.
 *
 * @ets_data_first partitionMap_
 */
export function partitionMap<A, B, C>(f: (a: A) => Either<B, C>) {
  return (self: Chunk<A>): Tuple<[Chunk<B>, Chunk<C>]> => self.partitionMap(f)
}
