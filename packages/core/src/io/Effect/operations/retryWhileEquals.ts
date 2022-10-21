/**
 * Retries this effect for as long as its error is equal to the specified
 * error.
 *
 * @tsplus static effect/core/io/Effect.Aspects retryWhileEquals
 * @tsplus pipeable effect/core/io/Effect retryWhileEquals
 */
export function retryWhileEquals<E>(E: Equivalence<E>, e: E) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    self.retryWhile((err) => E.equals(e, err))
}
