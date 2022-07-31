/**
 * Repeats this effect while its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @tsplus static effect/core/io/Effect.Aspects repeatWhile
 * @tsplus pipeable effect/core/io/Effect repeatWhile
 */
export function repeatWhile<A>(f: Predicate<A>) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, A> =>
    self.repeatWhileEffect((a) => Effect.sync(f(a)))
}
