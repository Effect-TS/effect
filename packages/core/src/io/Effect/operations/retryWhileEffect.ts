import type { Effect, RIO } from "../definition"

/**
 * Retries this effect while its error satisfies the specified effectful
 * predicate.
 *
 * @tsplus fluent ets/Effect retryWhileEffect
 */
export function retryWhileEffect_<R, R1, E, A>(
  self: Effect<R, E, A>,
  f: (e: E) => RIO<R1, boolean>,
  __etsTrace?: string
): Effect<R & R1, E, A> {
  return self.retryUntilEffect((e) => f(e).negate())
}

/**
 * Retries this effect while its error satisfies the specified effectful
 * predicate.
 *
 * @ets_data_first retryWhileEffect_
 */
export function retryWhileEffect<R1, E>(
  f: (e: E) => RIO<R1, boolean>,
  __etsTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R1, E, A> => self.retryWhileEffect(f)
}
