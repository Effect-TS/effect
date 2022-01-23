import type { Effect } from "../../../../Effect/definition"
import { succeedNow } from "../../../../Effect/operations/succeedNow"
import { suspendSucceed } from "../../../../Effect/operations/suspendSucceed"
import { zipWith_ } from "../../../../Effect/operations/zipWith"
import { concreteId } from "../_definition"
import * as Chunk from "../core"

/**
 * Filters this chunk by the specified effectful predicate, retaining all elements for
 * which the predicate evaluates to true.
 */
export function filterEffect_<R, E, A>(
  self: Chunk.Chunk<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, Chunk.Chunk<A>> {
  return suspendSucceed(() => {
    const iterator = concreteId(self).arrayLikeIterator()
    let next
    let dest: Effect<R, E, Chunk.Chunk<A>> = succeedNow(Chunk.empty<A>())

    while ((next = iterator.next()) && !next.done) {
      const array = next.value
      const len = array.length
      let i = 0
      while (i < len) {
        const a = array[i]!
        dest = zipWith_(dest, f(a), (d, b) => (b ? Chunk.append_(d, a) : d))
        i++
      }
    }
    return dest
  })
}

/**
 * Filters this chunk by the specified effectful predicate, retaining all elements for
 * which the predicate evaluates to true.
 *
 * @ets_data_first filterEffect_
 */
export function filterEffect<R, E, A>(
  f: (a: A) => Effect<R, E, boolean>
): (self: Chunk.Chunk<A>) => Effect<R, E, Chunk.Chunk<A>> {
  return (self) => filterEffect_(self, f)
}
