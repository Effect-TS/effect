import type { Effect } from "../../../../Effect/definition"
import { chain_ } from "../../../../Effect/operations/chain"
import { map_ } from "../../../../Effect/operations/map"
import { succeedNow } from "../../../../Effect/operations/succeedNow"
import { suspendSucceed } from "../../../../Effect/operations/suspendSucceed"
import * as Chunk from "../core"
import { concreteId } from "../definition"

/**
 * Takes all elements so long as the effectual predicate returns true.
 */
export function takeWhileEffect_<R, E, A>(
  self: Chunk.Chunk<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, Chunk.Chunk<A>> {
  return suspendSucceed(() => {
    const iterator = concreteId(self).arrayLikeIterator()
    let next
    let taking: Effect<R, E, boolean> = succeedNow(true)
    let builder = Chunk.empty<A>()

    while ((next = iterator.next()) && !next.done) {
      const array = next.value
      const len = array.length
      let i = 0
      while (i < len) {
        const a = array[i]!
        taking = chain_(taking, (d) =>
          map_(d ? f(a) : succeedNow(false), (b) => {
            if (b) {
              builder = Chunk.append_(builder, a)
            }
            return b
          })
        )
        i++
      }
    }
    return map_(taking, () => builder)
  })
}

/**
 * Takes all elements so long as the effectual predicate returns true.
 *
 * @ets_data_first takeWhileEffect_
 */
export function takeWhileEffect<R, E, A>(
  f: (a: A) => Effect<R, E, boolean>
): (self: Chunk.Chunk<A>) => Effect<R, E, Chunk.Chunk<A>> {
  return (self) => takeWhileEffect_(self, f)
}
