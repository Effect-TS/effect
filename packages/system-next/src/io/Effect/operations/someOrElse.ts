import * as O from "../../../data/Option"
import type { Effect } from "../definition"

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @tsplus fluent ets/Effect someOrElse
 */
export function someOrElse_<R, E, A, B>(
  self: Effect<R, E, O.Option<A>>,
  orElse: () => B,
  __etsTrace?: string
): Effect<R, E, A | B> {
  return self.map(O.getOrElse(orElse))
}

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @ets_data_first someOrElse_
 */
export function someOrElse<B>(orElse: () => B, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, O.Option<A>>) => someOrElse_(self, orElse)
}
