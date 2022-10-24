import { identity } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @tsplus static effect/core/io/Effect.Aspects unrefine
 * @tsplus pipeable effect/core/io/Effect unrefine
 * @category mutations
 * @since 1.0.0
 */
export function unrefine<E1>(
  pf: (u: unknown) => Option<E1>
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E | E1, A> => self.unrefineWith(pf, identity)
}
