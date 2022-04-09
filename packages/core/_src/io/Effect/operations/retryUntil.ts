/**
 * Retries this effect until its error satisfies the specified predicate.
 *
 * @tsplus fluent ets/Effect retryUntil
 */
export function retryUntil_<R, E, A>(
  self: Effect<R, E, A>,
  f: Predicate<E>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return self.retryUntilEffect((e) => Effect.succeed(f(e)));
}

/**
 * Retries this effect until its error satisfies the specified predicate.
 *
 * @ets_data_first retryUntil_
 */
export const retryUntil = Pipeable(retryUntil_);
