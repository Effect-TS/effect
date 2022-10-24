import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Filters the values produced by this generator, discarding any values that
 * meet the specified predicate.
 *
 * @tsplus static effect/core/testing/Gen.Aspects filterNot
 * @tsplus pipeable effect/core/testing/Gen filterNot
 * @category filtering
 * @since 1.0.0
 */
export function filterNot<A>(f: Predicate<A>) {
  return <R>(self: Gen<R, A>): Gen<R, A> => self.filter(a => !f(a))
}
