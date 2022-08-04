import { concreteChunkId } from "@tsplus/stdlib/collections/Chunk"

/**
 * Folds over the elements in this chunk from the left.
 * Stops the fold early when the condition is not fulfilled.
 *
 * @tsplus static effect/core/io/Effect.Ops reduceWhile
 */
export function reduceWhile<A, R, E, S>(
  self: Collection<A>,
  s: S,
  p: Predicate<S>,
  f: (s: S, a: A) => Effect<R, E, S>
): Effect<R, E, S> {
  const chunk = Chunk.from(self)
  const iterator = concreteChunkId(chunk)._arrayLikeIterator()
  const next = iterator.next()
  if (next.done) {
    return Effect.succeed(s)
  } else {
    const array = next.value
    const length = array.length
    return reduceWhileLoop(s, iterator, array, 0, length, p, f)
  }
}

function reduceWhileLoop<A, R, E, S>(
  s: S,
  iterator: Iterator<ArrayLike<A>, any, undefined>,
  array: ArrayLike<A>,
  i: number,
  length: number,
  p: Predicate<S>,
  f: (s: S, a: A) => Effect<R, E, S>
): Effect<R, E, S> {
  if (i < length) {
    if (p(s)) {
      return f(s, array[i]!).flatMap((s1) =>
        reduceWhileLoop(s1, iterator, array, i + 1, length, p, f)
      )
    } else {
      return Effect.succeed(s)
    }
  } else {
    const next = iterator.next()
    if (next.done) {
      return Effect.succeed(s)
    } else {
      const arr = next.value
      return Effect.suspendSucceed(reduceWhileLoop(s, iterator, arr, 0, arr.length, p, f))
    }
  }
}
