import * as core from "../../../../Effect/core"
import type { Effect } from "../../../../Effect/effect"
import * as coreMap from "../../../../Effect/map"
import * as Chunk from "../core"
import { concreteId } from "../definition"

/**
 * Drops all elements so long as the predicate returns true.
 */
export function dropWhileM_<R, E, A>(
  self: Chunk.Chunk<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, Chunk.Chunk<A>> {
  return core.suspend(() => {
    const iterator = concreteId(self).arrayLikeIterator()
    let next
    let dropping: Effect<R, E, boolean> = core.succeed(true)
    let builder = Chunk.empty<A>()

    while ((next = iterator.next()) && !next.done) {
      const array = next.value
      const len = array.length
      let i = 0
      while (i < len) {
        const a = array[i]!
        dropping = core.chain_(dropping, (d) =>
          coreMap.map_(d ? f(a) : core.succeed(false), (b) => {
            if (!b) {
              builder = Chunk.append_(builder, a)
            }
            return b
          })
        )
        i++
      }
      next = iterator.next()
    }
    return coreMap.map_(dropping, () => builder)
  })
}

/**
 * Drops all elements so long as the predicate returns true.
 *
 * @ets_data_first dropWhileM_
 */
export function dropWhileM<R, E, A>(
  f: (a: A) => Effect<R, E, boolean>
): (self: Chunk.Chunk<A>) => Effect<R, E, Chunk.Chunk<A>> {
  return (self) => dropWhileM_(self, f)
}
