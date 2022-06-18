import type { IterableArrayLike } from "@tsplus/stdlib/collections/Chunk/definition"
import { concreteChunkId } from "@tsplus/stdlib/collections/Chunk/definition"

/**
 * Returns the first element that satisfies the effectful predicate.
 *
 * @tsplus fluent Chunk findEffect
 */
export function findEffect_<R, E, A>(
  self: Chunk<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __tsplusTrace?: string
): Effect<R, E, Maybe<A>> {
  return Effect.suspendSucceed(() => {
    const iterator = concreteChunkId(self)._arrayLikeIterator()
    let next: IteratorResult<IterableArrayLike<A>, any>
    const loop = (
      iterator: Iterator<IterableArrayLike<A>>,
      array: IterableArrayLike<A>,
      i: number,
      length: number
    ): Effect<R, E, Maybe<A>> => {
      if (i < length) {
        const a = array[i]!

        return f(a).flatMap((r) => r ? Effect.succeedNow(Maybe.some(a)) : loop(iterator, array, i + 1, length))
      } else if (!(next = iterator.next()).done) {
        return loop(iterator, next.value, 0, next.value.length)
      } else {
        return Effect.succeedNow(Maybe.none)
      }
    }

    next = iterator.next()

    if (!next.done) {
      return loop(iterator, next.value, 0, next.value.length)
    } else {
      return Effect.succeedNow(Maybe.none)
    }
  })
}

/**
 * Returns the first element that satisfies the effectful predicate.
 *
 * @tsplus static Chunk/Aspects findEffect
 */
export const findEffect = Pipeable(findEffect_)
