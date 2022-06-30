/**
 * Retries this effect while its error satisfies the specified predicate.
 *
 * @tsplus static effect/core/io/Effect.Aspects retryWhile
 * @tsplus pipeable effect/core/io/Effect retryWhile
 */
export function retryWhile<E>(f: Predicate<E>, __tsplusTrace?: string) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E, A> => self.retryWhileEffect((e) => Effect.succeed(f(e)))
}
