import { Option } from "../../../../data/Option"
import { Effect } from "../../../../io/Effect"
import type { Chunk, IterableArrayLike } from "../definition"
import { concreteId } from "../definition"

/**
 * Returns the first element that satisfies the effectful predicate.
 *
 * @tsplus fluent ets/Chunk findEffect
 */
export function findEffect_<R, E, A>(
  self: Chunk<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
): Effect<R, E, Option<A>> {
  return Effect.suspendSucceed(() => {
    const iterator = concreteId(self)._arrayLikeIterator()
    let next: IteratorResult<IterableArrayLike<A>, any>
    const loop = (
      iterator: Iterator<IterableArrayLike<A>>,
      array: IterableArrayLike<A>,
      i: number,
      length: number
    ): Effect<R, E, Option<A>> => {
      if (i < length) {
        const a = array[i]!

        return f(a).flatMap((r) =>
          r ? Effect.succeedNow(Option.some(a)) : loop(iterator, array, i + 1, length)
        )
      } else if (!(next = iterator.next()).done) {
        return loop(iterator, next.value, 0, next.value.length)
      } else {
        return Effect.succeedNow(Option.none)
      }
    }

    next = iterator.next()

    if (!next.done) {
      return loop(iterator, next.value, 0, next.value.length)
    } else {
      return Effect.succeedNow(Option.none)
    }
  })
}

/**
 * Returns the first element that satisfies the effectful predicate.
 *
 * @ets_data_first findEffect_
 */
export function findEffect<R, E, A>(
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
) {
  return (self: Chunk<A>): Effect<R, E, Option<A>> => self.findEffect(f)
}
