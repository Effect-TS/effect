import type { Predicate } from "../../../data/Function"
import { Effect } from "../definition"

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
  return self.retryWhileEffect((e) => Effect.succeed(f(e)))
}

/**
 * Retries this effect while its error satisfies the specified predicate.
 *
 * @ets_data_first retryWhile_
 */
export function retryWhile<E>(f: Predicate<E>, __tsplusTrace?: string) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E, A> => self.retryWhile(f)
}
