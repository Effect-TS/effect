/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects.
 *
 * @tsplus static effect/core/io/Effect.Ops whenEffect
 */
export function whenEffect<R, E, R1, E1, A>(
  predicate: LazyArg<Effect<R, E, boolean>>,
  effect: LazyArg<Effect<R1, E1, A>>,
  __tsplusTrace?: string
): Effect<R | R1, E | E1, Maybe<A>> {
  return Effect.suspendSucceed(predicate).flatMap((b) => b ? effect().asSome : Effect.none)
}
