/**
 * Retries this effect until its error is equal to the specified error.
 *
 * @tsplus static effect/core/io/Effect.Aspects retryUntilEquals
 * @tsplus pipeable effect/core/io/Effect retryUntilEquals
 */
export function retryUntilEquals<E>(
  E: Equivalence<E>,
  e: LazyArg<E>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    Effect.sync(e).flatMap((_) => self.retryUntil((e) => E.equals(_, e)))
}
