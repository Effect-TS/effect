import type { IterableArrayLike } from "@tsplus/stdlib/collections/Chunk"
import { concreteChunkId } from "@tsplus/stdlib/collections/Chunk"

/**
 * Returns the first element that satisfies the effectful predicate.
 *
 * @tsplus static effect/core/io/Effect.Ops find
 */
export function find<R, E, A>(
  self: Collection<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, Maybe<A>> {
  return Effect.suspendSucceed(() => {
    const chunk = Chunk.from(self)
    const iterator = concreteChunkId(chunk)._arrayLikeIterator()
    let next: IteratorResult<IterableArrayLike<A>, any>
    const loop = (
      iterator: Iterator<IterableArrayLike<A>>,
      array: IterableArrayLike<A>,
      i: number,
      length: number
    ): Effect<R, E, Maybe<A>> => {
      if (i < length) {
        const a = array[i]!

        return f(a).flatMap((r) =>
          r ? Effect.succeed(Maybe.some(a)) : loop(iterator, array, i + 1, length)
        )
      } else if (!(next = iterator.next()).done) {
        return loop(iterator, next.value, 0, next.value.length)
      } else {
        return Effect.succeed(Maybe.none)
      }
    }
    next = iterator.next()
    if (!next.done) {
      return loop(iterator, next.value, 0, next.value.length)
    } else {
      return Effect.succeed(Maybe.none)
    }
  })
}
