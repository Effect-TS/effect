/**
 * Retries this effect while its error satisfies the specified effectful
 * predicate.
 *
 * @tsplus fluent ets/Effect retryWhileEffect
 */
export function retryWhileEffect_<R, R1, E, A>(
  self: Effect<R, E, A>,
  f: (e: E) => Effect<R1, never, boolean>,
  __tsplusTrace?: string
): Effect<R | R1, E, A> {
  return self.retryUntilEffect((e) => f(e).negate())
}

/**
 * Retries this effect while its error satisfies the specified effectful
 * predicate.
 *
 * @tsplus static ets/Effect/Aspects retryWhileEffect
 */
export const retryWhileEffect = Pipeable(retryWhileEffect_)
