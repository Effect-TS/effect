import * as Option from "@fp-ts/data/Option"

/**
 * The moral equivalent of `if (p) exp`.
 *
 * @tsplus static effect/core/io/Effect.Ops when
 */
export function when<R, E, A>(
  predicate: LazyArg<boolean>,
  effect: Effect<R, E, A>
): Effect<R, E, Option.Option<A>> {
  return Effect.suspendSucceed(
    predicate() ? effect.map(Option.some) : Effect.succeed(Option.none)
  )
}
