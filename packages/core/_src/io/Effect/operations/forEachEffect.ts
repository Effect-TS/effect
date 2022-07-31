/**
 * Returns a new effect that will pass the success value of this effect to the
 * provided callback. If this effect fails, then the failure will be ignored.
 *
 * @tsplus static effect/core/io/Effect.Aspects forEachEffect
 * @tsplus pipeable effect/core/io/Effect forEachEffect
 */
export function forEachEffect<A, R1, E1, B>(f: (a: A) => Effect<R1, E1, B>) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R1, E1, Maybe<B>> =>
    self.foldCauseEffect(
      () => Effect.none,
      (a) => f(a).map(Maybe.some)
    )
}
