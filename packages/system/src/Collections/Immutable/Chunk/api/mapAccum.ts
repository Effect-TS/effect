// ets_tracing: off

import * as Tp from "../../Tuple/index.js"
import * as Chunk from "../core.js"
import { concreteId } from "../definition.js"

/**
 * Statefully maps over the chunk, producing new elements of type `B`.
 */
export function mapAccum_<A, B, S>(
  self: Chunk.Chunk<A>,
  s: S,
  f: (s: S, a: A) => Tp.Tuple<[S, B]>
): Tp.Tuple<[S, Chunk.Chunk<B>]> {
  const iterator = concreteId(self).arrayLikeIterator()
  let next
  let s1 = s
  let builder = Chunk.empty<B>()

  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let i = 0
    while (i < len) {
      const a = array[i]!
      const x = f(s1, a)
      s1 = x.get(0)
      builder = Chunk.append_(builder, x.get(1))
      i++
    }
  }

  return Tp.tuple(s1, builder)
}

/**
 * Statefully maps over the chunk, producing new elements of type `B`.
 *
 * @ets_data_first mapAccum_
 */
export function mapAccum<A, B, S>(
  s: S,
  f: (s: S, a: A) => Tp.Tuple<[S, B]>
): (self: Chunk.Chunk<A>) => Tp.Tuple<[S, Chunk.Chunk<B>]> {
  return (self) => mapAccum_(self, s, f)
}
