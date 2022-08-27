/**
 * Retries this effect until its error is equal to the specified error.
 *
 * @tsplus static effect/core/io/Effect.Aspects retryUntilEquals
 * @tsplus pipeable effect/core/io/Effect retryUntilEquals
 */
export function retryUntilEquals<E>(E: Equivalence<E>, e: E) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    self.retryUntil((err) => E.equals(err, e))
}
