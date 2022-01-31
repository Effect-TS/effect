import { Effect } from "../../../../io/Effect/definition"
import { Tuple } from "../../Tuple"
import { concreteId } from "../_definition"
import * as Chunk from "../core"

/**
 * Statefully and effectfully maps over the elements of this chunk to produce
 * new elements.
 */
export function mapAccumEffect_<A, B, R, E, S>(
  self: Chunk.Chunk<A>,
  s: S,
  f: (s: S, a: A) => Effect<R, E, Tuple<[S, B]>>
): Effect<R, E, Tuple<[S, Chunk.Chunk<B>]>> {
  return Effect.suspendSucceed(() => {
    const iterator = concreteId(self).arrayLikeIterator()
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
            builder = Chunk.append_(builder, b)
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
): (self: Chunk.Chunk<A>) => Effect<R, E, Tuple<[S, Chunk.Chunk<B>]>> {
  return (self) => mapAccumEffect_(self, s, f)
}
