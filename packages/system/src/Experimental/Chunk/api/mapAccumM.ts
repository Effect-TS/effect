import * as core from "../../../Effect/core"
import type { Effect } from "../../../Effect/effect"
import * as coreMap from "../../../Effect/map"
import * as Chunk from "../core"

/**
 * Statefully and effectfully maps over the elements of this chunk to produce
 * new elements.
 */
export function mapAccumM_<A, B, R, E, S>(
  self: Chunk.Chunk<A>,
  s: S,
  f: (s: S, a: A) => Effect<R, E, readonly [S, B]>
): Effect<R, E, readonly [S, Chunk.Chunk<B>]> {
  return core.suspend(() => {
    const iterator = self.arrayLikeIterator()
    let dest: Effect<R, E, S> = core.succeed(s)
    let builder = Chunk.empty<B>()
    let next = iterator.next()
    while (!next.done) {
      const array = next.value
      const length = array.length
      let i = 0
      while (i < length) {
        const a = array[i]!
        dest = core.chain_(dest, (state) =>
          coreMap.map_(f(state, a), ([s, b]) => {
            builder = Chunk.append_(builder, b)
            return s
          })
        )
        i++
      }
      next = iterator.next()
    }
    return coreMap.map_(dest, (s) => [s, builder] as const)
  })
}

/**
 * Statefully and effectfully maps over the elements of this chunk to produce
 * new elements.
 *
 * @dataFirst mapAccumM_
 */
export function mapAccumM<A, B, R, E, S>(
  s: S,
  f: (s: S, a: A) => Effect<R, E, readonly [S, B]>
): (self: Chunk.Chunk<A>) => Effect<R, E, readonly [S, Chunk.Chunk<B>]> {
  return (self) => mapAccumM_(self, s, f)
}
