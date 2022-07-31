/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 *
 * @tsplus static effect/core/io/Effect.Aspects unlessEffect
 * @tsplus pipeable effect/core/io/Effect unlessEffect
 */
export function unlessEffect<R2, E2>(
  predicate: LazyArg<Effect<R2, E2, boolean>>
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, Maybe<A>> =>
    Effect.suspendSucceed(
      predicate().flatMap((b) => (b ? Effect.none : self.asSome))
    )
}
