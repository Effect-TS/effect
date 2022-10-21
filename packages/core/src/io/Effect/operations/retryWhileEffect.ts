/**
 * Retries this effect while its error satisfies the specified effectful
 * predicate.
 *
 * @tsplus static effect/core/io/Effect.Aspects retryWhileEffect
 * @tsplus pipeable effect/core/io/Effect retryWhileEffect
 */
export function retryWhileEffect<R1, E>(
  f: (e: E) => Effect<R1, never, boolean>
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R | R1, E, A> =>
    self.retryUntilEffect((e) => f(e).negate)
}
