// ets_tracing: off

import type * as E from "../../../../Either/index.js"
import * as Tp from "../../Tuple/index.js"
import * as Chunk from "../core.js"
import { forEach_ } from "./forEach.js"

/**
 * Partitions the elements of this chunk into two chunks using the specified
 * function.
 */
export function partitionMap_<A, B, C>(
  self: Chunk.Chunk<A>,
  f: (a: A) => E.Either<B, C>
): Tp.Tuple<[Chunk.Chunk<B>, Chunk.Chunk<C>]> {
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

  return Tp.tuple(bs, cs)
}

/**
 * Partitions the elements of this chunk into two chunks using the specified
 * function.
 *
 * @ets_data_first partitionMap_
 */
export function partitionMap<A, B, C>(
  f: (a: A) => E.Either<B, C>
): (self: Chunk.Chunk<A>) => Tp.Tuple<[Chunk.Chunk<B>, Chunk.Chunk<C>]> {
  return (self) => partitionMap_(self, f)
}
