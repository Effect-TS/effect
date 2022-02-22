import { Effect } from "../../../../io/Effect"
import { Chunk, concreteId } from "../definition"

/**
 * Takes all elements so long as the effectual predicate returns true.
 *
 * @tsplus fluent ets/Chunk takeWhileEffect
 */
export function takeWhileEffect_<R, E, A>(
  self: Chunk<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
): Effect<R, E, Chunk<A>> {
  return Effect.suspendSucceed(() => {
    const iterator = concreteId(self)._arrayLikeIterator()
    let next
    let taking: Effect<R, E, boolean> = Effect.succeedNow(true)
    let builder = Chunk.empty<A>()

    while ((next = iterator.next()) && !next.done) {
      const array = next.value
      const len = array.length
      let i = 0
      while (i < len) {
        const a = array[i]!
        taking = taking.flatMap((d) =>
          (d ? f(a) : Effect.succeedNow(false)).map((b) => {
            if (b) {
              builder = builder.append(a)
            }
            return b
          })
        )
        i++
      }
    }
    return taking.map(() => builder)
  })
}

/**
 * Takes all elements so long as the effectual predicate returns true.
 *
 * @ets_data_first takeWhileEffect_
 */
export function takeWhileEffect<R, E, A>(
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
) {
  return (self: Chunk<A>): Effect<R, E, Chunk<A>> => self.takeWhileEffect(f)
}
