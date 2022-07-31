/**
 * Retries this effect until its error satisfies the specified predicate.
 *
 * @tsplus static effect/core/io/Effect.Aspects retryUntil
 * @tsplus pipeable effect/core/io/Effect retryUntil
 */
export function retryUntil<E>(f: Predicate<E>) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    self.retryUntilEffect((e) => Effect.sync(f(e)))
}
