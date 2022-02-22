import type { Predicate } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Retries this effect until its error satisfies the specified predicate.
 *
 * @tsplus fluent ets/Effect retryUntil
 */
export function retryUntil_<R, E, A>(
  self: Effect<R, E, A>,
  f: Predicate<E>,
  __etsTrace?: string
): Effect<R, E, A> {
  return self.retryUntilEffect((e) => Effect.succeed(f(e)))
}

/**
 * Retries this effect until its error satisfies the specified predicate.
 *
 * @ets_data_first retryUntil_
 */
export function retryUntil<E>(f: Predicate<E>, __etsTrace?: string) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E, A> => self.retryUntil(f)
}
