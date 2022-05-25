/**
 * Retries this effect for as long as its error is equal to the specified
 * error.
 *
 * @tsplus fluent ets/Effect retryWhileEquals
 */
export function retryWhileEquals_<R, E, A>(self: Effect<R, E, A>, E: Equivalence<E>) {
  return (e: LazyArg<E>, __tsplusTrace?: string): Effect<R, E, A> =>
    Effect.succeed(e).flatMap((_) => self.retryWhile((e) => E.equals(_, e)))
}

/**
 * Retries this effect for as long as its error is equal to the specified
 * error.
 *
 * @tsplus static ets/Effect/Aspects retryWhileEquals
 */
export const retryWhileEquals = Pipeable(retryWhileEquals_)
