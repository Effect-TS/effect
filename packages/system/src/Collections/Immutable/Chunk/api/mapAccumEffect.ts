import * as core from "../../../../Effect/core"
import type { Effect } from "../../../../Effect/effect"
import * as coreMap from "../../../../Effect/map"
import * as Tp from "../../Tuple"
import * as Chunk from "../core"
import { concreteId } from "../definition"

/**
 * Statefully and effectfully maps over the elements of this chunk to produce
 * new elements.
 */
export function mapAccumEffect_<A, B, R, E, S>(
  self: Chunk.Chunk<A>,
  s: S,
  f: (s: S, a: A) => Effect<R, E, Tp.Tuple<[S, B]>>
): Effect<R, E, Tp.Tuple<[S, Chunk.Chunk<B>]>> {
  return core.suspend(() => {
    const iterator = concreteId(self).arrayLikeIterator()
    let dest: Effect<R, E, S> = core.succeed(s)
    let builder = Chunk.empty<B>()
    let next
    while ((next = iterator.next()) && !next.done) {
      const array = next.value
      const length = array.length
      let i = 0
      while (i < length) {
        const a = array[i]!
        dest = core.chain_(dest, (state) =>
          coreMap.map_(f(state, a), ({ tuple: [s, b] }) => {
            builder = Chunk.append_(builder, b)
            return s
          })
        )
        i++
      }
    }
    return coreMap.map_(dest, (s) => Tp.tuple(s, builder))
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
