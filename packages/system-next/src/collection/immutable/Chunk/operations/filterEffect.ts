import { Effect } from "../../../../io/Effect"
import { Chunk, concreteId } from "../definition"

/**
 * Filters this chunk by the specified effectful predicate, retaining all
 * elements for which the predicate evaluates to true.
 *
 * @tsplus fluent ets/Chunk filterEffect
 */
export function filterEffect_<R, E, A>(
  self: Chunk<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
): Effect<R, E, Chunk<A>> {
  return Effect.suspendSucceed(() => {
    const iterator = concreteId(self)._arrayLikeIterator()
    let next
    let dest: Effect<R, E, Chunk<A>> = Effect.succeedNow(Chunk.empty<A>())

    while ((next = iterator.next()) && !next.done) {
      const array = next.value
      const len = array.length
      let i = 0
      while (i < len) {
        const a = array[i]!
        dest = dest.zipWith(f(a), (d, b) => (b ? d.append(a) : d))
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
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
) {
  return (self: Chunk<A>): Effect<R, E, Chunk<A>> => self.filterEffect(f)
}
