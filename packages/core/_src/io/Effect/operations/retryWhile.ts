/**
 * Retries this effect while its error satisfies the specified predicate.
 *
 * @tsplus fluent ets/Effect retryWhile
 */
export function retryWhile_<R, E, A>(
  self: Effect<R, E, A>,
  f: Predicate<E>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return self.retryWhileEffect((e) => Effect.succeed(f(e)));
}

/**
 * Retries this effect while its error satisfies the specified predicate.
 *
 * @tsplus static ets/Effect/Aspects retryWhile
 */
export const retryWhile = Pipeable(retryWhile_);
