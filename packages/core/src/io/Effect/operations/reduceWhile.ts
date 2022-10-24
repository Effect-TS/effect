import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Folds over the elements in this chunk from the left.
 * Stops the fold early when the condition is not fulfilled.
 *
 * @tsplus static effect/core/io/Effect.Ops reduceWhile
 * @category folding
 * @since 1.0.0
 */
export function reduceWhile<A, R, E, S>(
  as: Iterable<A>,
  s: S,
  p: Predicate<S>,
  f: (s: S, a: A) => Effect<R, E, S>
): Effect<R, E, S> {
  const iterator = as[Symbol.iterator]()
  let next: IteratorResult<A, any>
  let acc: Effect<R, E, S> = Effect.succeed(s)
  while (!(next = iterator.next()).done) {
    acc = acc.flatMap((s) => f(s, next.value))
  }
  return acc
}
