/**
 * Retries this effect until its error is equal to the specified error.
 *
 * @tsplus fluent ets/Effect retryUntilEquals
 */
export function retryUntilEquals_<R, E, A>(self: Effect<R, E, A>, E: Equivalence<E>) {
  return (e: LazyArg<E>, __tsplusTrace?: string): Effect<R, E, A> =>
    Effect.succeed(e).flatMap((_) => self.retryUntil((e) => E.equals(_, e)))
}

/**
 * Retries this effect until its error is equal to the specified error.
 *
 * @tsplus static ets/Effect/Aspects retryUntilEquals
 */
export const retryUntilEquals = Pipeable(retryUntilEquals_)
