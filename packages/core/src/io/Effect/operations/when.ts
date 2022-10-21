/**
 * The moral equivalent of `if (p) exp`.
 *
 * @tsplus static effect/core/io/Effect.Ops when
 */
export function when<R, E, A>(
  predicate: LazyArg<boolean>,
  effect: Effect<R, E, A>
): Effect<R, E, Maybe<A>> {
  return Effect.suspendSucceed(
    predicate() ? effect.map(Maybe.some) : Effect.succeed(Maybe.none)
  )
}
