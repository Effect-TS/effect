/**
 * Repeats this effect until its value satisfies the specified predicate or
 * until the first failure.
 *
 * @tsplus static effect/core/io/Effect.Aspects repeatUntil
 * @tsplus pipeable effect/core/io/Effect repeatUntil
 */
export function repeatUntil<A>(p: Predicate<A>) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, A> =>
    self.repeatUntilEffect((a) => Effect.sync(p(a)))
}
