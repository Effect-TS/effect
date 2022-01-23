import type { Effect } from "../../../../Effect/definition"
import { chain_ } from "../../../../Effect/operations/chain"
import { map_ } from "../../../../Effect/operations/map"
import { succeedNow } from "../../../../Effect/operations/succeedNow"
import { suspendSucceed } from "../../../../Effect/operations/suspendSucceed"
import * as Tp from "../../Tuple"
import { concreteId } from "../_definition"
import * as Chunk from "../core"

/**
 * Statefully and effectfully maps over the elements of this chunk to produce
 * new elements.
 */
export function mapAccumEffect_<A, B, R, E, S>(
  self: Chunk.Chunk<A>,
  s: S,
  f: (s: S, a: A) => Effect<R, E, Tp.Tuple<[S, B]>>
): Effect<R, E, Tp.Tuple<[S, Chunk.Chunk<B>]>> {
  return suspendSucceed(() => {
    const iterator = concreteId(self).arrayLikeIterator()
    let dest: Effect<R, E, S> = succeedNow(s)
    let builder = Chunk.empty<B>()
    let next
    while ((next = iterator.next()) && !next.done) {
      const array = next.value
      const length = array.length
      let i = 0
      while (i < length) {
        const a = array[i]!
        dest = chain_(dest, (state) =>
          map_(f(state, a), ({ tuple: [s, b] }) => {
            builder = Chunk.append_(builder, b)
            return s
          })
        )
        i++
      }
    }
    return map_(dest, (s) => Tp.tuple(s, builder))
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
  f: (s: S, a: A) => Effect<R, E, Tp.Tuple<[S, B]>>
): (self: Chunk.Chunk<A>) => Effect<R, E, Tp.Tuple<[S, Chunk.Chunk<B>]>> {
  return (self) => mapAccumEffect_(self, s, f)
}
