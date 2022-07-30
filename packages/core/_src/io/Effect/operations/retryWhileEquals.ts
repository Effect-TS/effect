/**
 * Retries this effect for as long as its error is equal to the specified
 * error.
 *
 * @tsplus static effect/core/io/Effect.Aspects retryWhileEquals
 * @tsplus pipeable effect/core/io/Effect retryWhileEquals
 */
export function retryWhileEquals<E>(
  E: Equivalence<E>,
  e: LazyArg<E>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    Effect.sync(e).flatMap((_) => self.retryWhile((e) => E.equals(_, e)))
}
