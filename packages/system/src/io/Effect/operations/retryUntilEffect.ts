import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Retries this effect until its error satisfies the specified effectful
 * predicate.
 *
 * @tsplus fluent ets/Effect retryUntilEffect
 */
export function retryUntilEffect_<R, R1, E, A>(
  self: Effect<R, E, A>,
  f: (e: E) => RIO<R1, boolean>,
  __etsTrace?: string
): Effect<R & R1, E, A> {
  return self.catchAll((e) =>
    f(e).flatMap((b) =>
      b ? Effect.fail(e) : Effect.yieldNow > self.retryUntilEffect(f)
    )
  )
}

/**
 * Retries this effect until its error satisfies the specified effectful
 * predicate.
 *
 * @ets_data_first retryUntilEffect_
 */
export function retryUntilEffect<R1, E>(
  f: (e: E) => RIO<R1, boolean>,
  __etsTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R1, E, A> => self.retryUntilEffect(f)
}
