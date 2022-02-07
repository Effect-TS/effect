// ets_tracing: off

import type * as Tp from "../../Tuple/index.js"
import type * as Chunk from "../core.js"
import { concreteId } from "../definition.js"
import { splitAt_ } from "./splitAt.js"
/**
 * Splits this chunk on the first element that matches this predicate.
 */
export function splitWhere_<A>(
  self: Chunk.Chunk<A>,
  f: (a: A) => boolean
): Tp.Tuple<[Chunk.Chunk<A>, Chunk.Chunk<A>]> {
  const iterator = concreteId(self).arrayLikeIterator()
  let next
  let cont = true
  let i = 0

  while (cont && (next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let j = 0
    while (cont && j < len) {
      const a = array[j]!
      if (f(a)) {
        cont = false
      } else {
        i++
        j++
      }
    }
  }

  return splitAt_(self, i)
}

/**
 * Splits this chunk on the first element that matches this predicate.
 *
 * @ets_data_first splitWhere_
 */
export function splitWhere<A>(
  f: (a: A) => boolean
): (self: Chunk.Chunk<A>) => Tp.Tuple<[Chunk.Chunk<A>, Chunk.Chunk<A>]> {
  return (self) => splitWhere_(self, f)
}
