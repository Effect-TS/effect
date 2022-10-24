import type { Option } from "@fp-ts/data/Option"

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 *
 * @tsplus static effect/core/io/Effect.Aspects unlessEffect
 * @tsplus pipeable effect/core/io/Effect unlessEffect
 * @category mutations
 * @since 1.0.0
 */
export function unlessEffect<R2, E2>(predicate: Effect<R2, E2, boolean>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, Option<A>> =>
    predicate.flatMap((b) => (b ? Effect.none : self.asSome))
}
