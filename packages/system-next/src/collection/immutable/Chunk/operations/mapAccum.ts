import { Tuple } from "../../Tuple"
import { Chunk, concreteId } from "../definition"

/**
 * Statefully maps over the chunk, producing new elements of type `B`.
 *
 * @tsplus fluent ets/Chunk mapAccum
 */
export function mapAccum_<A, B, S>(
  self: Chunk<A>,
  s: S,
  f: (s: S, a: A) => Tuple<[S, B]>
): Tuple<[S, Chunk<B>]> {
  const iterator = concreteId(self)._arrayLikeIterator()
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
      builder = builder.append(x.get(1))
      i++
    }
  }

  return Tuple(s1, builder)
}

/**
 * Statefully maps over the chunk, producing new elements of type `B`.
 *
 * @ets_data_first mapAccum_
 */
export function mapAccum<A, B, S>(s: S, f: (s: S, a: A) => Tuple<[S, B]>) {
  return (self: Chunk<A>): Tuple<[S, Chunk<B>]> => self.mapAccum(s, f)
}
