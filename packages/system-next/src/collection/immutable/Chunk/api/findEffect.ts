import type { Effect } from "../../../../io/Effect/definition/base"
import { chain_ } from "../../../../io/Effect/operations/chain"
import { succeedNow } from "../../../../io/Effect/operations/succeedNow"
import { suspendSucceed } from "../../../../io/Effect/operations/suspendSucceed"
import * as O from "../../../../data/Option"
import { concreteId } from "../_definition"
import type * as Chunk from "../core"

/**
 * Returns the first element that satisfies the effectful predicate.
 */
export function findEffect_<R, E, A>(
  self: Chunk.Chunk<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, O.Option<A>> {
  return suspendSucceed(() => {
    const iterator = concreteId(self).arrayLikeIterator()
    let next: IteratorResult<Chunk.IterableArrayLike<A>, any>
    const loop = (
      iterator: Iterator<Chunk.IterableArrayLike<A>>,
      array: Chunk.IterableArrayLike<A>,
      i: number,
      length: number
    ): Effect<R, E, O.Option<A>> => {
      if (i < length) {
        const a = array[i]!

        return chain_(f(a), (r) =>
          r ? succeedNow(O.some(a)) : loop(iterator, array, i + 1, length)
        )
      } else if (!(next = iterator.next()).done) {
        return loop(iterator, next.value, 0, next.value.length)
      } else {
        return succeedNow(O.none)
      }
    }

    next = iterator.next()

    if (!next.done) {
      return loop(iterator, next.value, 0, next.value.length)
    } else {
      return succeedNow(O.none)
    }
  })
}

/**
 * Returns the first element that satisfies the effectful predicate.
 *
 * @ets_data_first findEffect_
 */
export function findEffect<R, E, A>(f: (a: A) => Effect<R, E, boolean>) {
  return (self: Chunk.Chunk<A>) => findEffect_(self, f)
}
