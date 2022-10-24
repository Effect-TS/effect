import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 *
 * @tsplus static effect/core/stm/STM.Ops filterNot
 * @category filtering
 * @since 1.0.0
 */
export function filterNot<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => STM<R, E, boolean>
): STM<R, E, Chunk<A>> {
  return STM.filter(as, (x) => f(x).map((b) => !b))
}
