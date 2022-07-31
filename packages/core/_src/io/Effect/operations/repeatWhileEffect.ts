/**
 * Repeats this effect while its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @tsplus static effect/core/io/Effect.Aspects repeatWhileEffect
 * @tsplus pipeable effect/core/io/Effect repeatWhileEffect
 */
export function repeatWhileEffect<R1, A>(
  f: (a: A) => Effect<R1, never, boolean>
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R1, E, A> =>
    self.repeatUntilEffect((a) => f(a).negate)
}
