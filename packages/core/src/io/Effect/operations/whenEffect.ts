import type { Option } from "@fp-ts/data/Option"

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects.
 *
 * @tsplus static effect/core/io/Effect.Ops whenEffect
 * @category mutations
 * @since 1.0.0
 */
export function whenEffect<R, E, R1, E1, A>(
  predicate: Effect<R, E, boolean>,
  effect: Effect<R1, E1, A>
): Effect<R | R1, E | E1, Option<A>> {
  return Effect.suspendSucceed(predicate).flatMap((b) => b ? effect.asSome : Effect.none)
}
