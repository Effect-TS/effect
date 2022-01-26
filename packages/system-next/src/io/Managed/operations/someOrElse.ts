import type { LazyArg } from "../../../data/Function"
import * as O from "../../../data/Option"
import type { Managed } from "../definition"

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @ets fluent ets/Managed someOrElse
 */
export function someOrElse_<R, E, A, B>(
  self: Managed<R, E, O.Option<A>>,
  orElse: LazyArg<B>,
  __etsTrace?: string
) {
  return self.map(O.getOrElse(orElse))
}

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @ets_data_first someOrElse_
 */
export function someOrElse<B>(orElse: LazyArg<B>, __etsTrace?: string) {
  return <R, E, A>(self: Managed<R, E, O.Option<A>>): Managed<R, E, A | B> =>
    someOrElse_(self, orElse)
}
