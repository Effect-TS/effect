import { Effect } from "../../../../io/Effect"
import { Chunk, concreteId } from "../definition"

/**
 * Drops all elements so long as the predicate returns true.
 *
 * @tsplus fluent ets/Chunk dropWhileEffect
 */
export function dropWhileEffect_<R, E, A>(
  self: Chunk<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
): Effect<R, E, Chunk<A>> {
  return Effect.suspendSucceed(() => {
    const iterator = concreteId(self)._arrayLikeIterator()
    let next
    let dropping: Effect<R, E, boolean> = Effect.succeedNow(true)
    let builder = Chunk.empty<A>()

    while ((next = iterator.next()) && !next.done) {
      const array = next.value
      const len = array.length
      let i = 0
      while (i < len) {
        const a = array[i]!
        dropping = dropping.flatMap((d) =>
          (d ? f(a) : Effect.succeedNow(false)).map((b) => {
            if (!b) {
              builder = builder.append(a)
            }
            return b
          })
        )
        i++
      }
    }
    return dropping.map(() => builder)
  })
}

/**
 * Drops all elements so long as the predicate returns true.
 *
 * @ets_data_first dropWhileEffect_
 */
export function dropWhileEffect<R, E, A>(
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
) {
  return (self: Chunk<A>): Effect<R, E, Chunk<A>> => self.dropWhileEffect(f)
}
