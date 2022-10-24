import { identity } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @tsplus static effect/core/io/Effect.Aspects refineOrDie
 * @tsplus pipeable effect/core/io/Effect refineOrDie
 * @category mutations
 * @since 1.0.0
 */
export function refineOrDie<E, E1>(pf: (e: E) => Option<E1>) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E1, A> => self.refineOrDieWith(pf, identity)
}
