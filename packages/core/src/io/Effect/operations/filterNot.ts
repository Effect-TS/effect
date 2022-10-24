import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 *
 * @tsplus static effect/core/io/Effect.Ops filterNot
 * @category filtering
 * @since 1.0.0
 */
export function filterNot<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, Chunk<A>> {
  return Effect.filter(as, (x) => f(x).map((b) => !b))
}
