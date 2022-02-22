import { Effect } from "../../../../io/Effect"
import { Tuple } from "../../Tuple"
import { Chunk, concreteId } from "../definition"

/**
 * Statefully and effectfully maps over the elements of this chunk to produce
 * new elements.
 *
 * @tsplus fluent ets/Chunk mapAccumEffect
 */
export function mapAccumEffect_<A, B, R, E, S>(
  self: Chunk<A>,
  s: S,
  f: (s: S, a: A) => Effect<R, E, Tuple<[S, B]>>
): Effect<R, E, Tuple<[S, Chunk<B>]>> {
  return Effect.suspendSucceed(() => {
    const iterator = concreteId(self)._arrayLikeIterator()
    let dest: Effect<R, E, S> = Effect.succeedNow(s)
    let builder = Chunk.empty<B>()
    let next
    while ((next = iterator.next()) && !next.done) {
      const array = next.value
      const length = array.length
      let i = 0
      while (i < length) {
        const a = array[i]!
        dest = dest.flatMap((state) =>
          f(state, a).map(({ tuple: [s, b] }) => {
            builder = builder.append(b)
            return s
          })
        )
        i++
      }
    }
    return dest.map((s) => Tuple(s, builder))
  })
}

/**
 * Statefully and effectfully maps over the elements of this chunk to produce
 * new elements.
 *
 * @ets_data_first mapAccumEffect_
 */
export function mapAccumEffect<A, B, R, E, S>(
  s: S,
  f: (s: S, a: A) => Effect<R, E, Tuple<[S, B]>>
) {
  return (self: Chunk<A>): Effect<R, E, Tuple<[S, Chunk<B>]>> =>
    self.mapAccumEffect(s, f)
}
