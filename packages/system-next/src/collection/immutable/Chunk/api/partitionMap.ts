import type { Either } from "../../../../data/Either"
import { Tuple } from "../../Tuple"
import * as Chunk from "../core"
import { forEach_ } from "./forEach"

/**
 * Partitions the elements of this chunk into two chunks using the specified
 * function.
 */
export function partitionMap_<A, B, C>(
  self: Chunk.Chunk<A>,
  f: (a: A) => Either<B, C>
): Tuple<[Chunk.Chunk<B>, Chunk.Chunk<C>]> {
  let bs = Chunk.empty<B>()
  let cs = Chunk.empty<C>()

  forEach_(self, (a) => {
    const x = f(a)
    if (x._tag === "Left") {
      bs = Chunk.append_(bs, x.left)
    } else {
      cs = Chunk.append_(cs, x.right)
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
export function partitionMap<A, B, C>(
  f: (a: A) => Either<B, C>
): (self: Chunk.Chunk<A>) => Tuple<[Chunk.Chunk<B>, Chunk.Chunk<C>]> {
  return (self) => partitionMap_(self, f)
}
