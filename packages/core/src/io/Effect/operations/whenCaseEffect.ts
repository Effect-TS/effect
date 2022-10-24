import type { Option } from "@fp-ts/data/Option"

/**
 * Runs an effect when the supplied partial function matches for the given
 * value, otherwise does nothing.
 *
 * @tsplus static effect/core/io/Effect.Ops whenCaseEffect
 * @category mutations
 * @since 1.0.0
 */
export function whenCaseEffect<R, E, A, R1, E1, B>(
  effect: Effect<R, E, A>,
  pf: (a: A) => Option<Effect<R1, E1, B>>
): Effect<R | R1, E | E1, Option<B>> {
  return effect.flatMap((a) => Effect.whenCase(a, pf))
}
