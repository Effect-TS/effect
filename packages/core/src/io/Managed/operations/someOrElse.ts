import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { Managed } from "../definition"

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @tsplus fluent ets/Managed someOrElse
 */
export function someOrElse_<R, E, A, B>(
  self: Managed<R, E, Option<A>>,
  orElse: LazyArg<B>,
  __tsplusTrace?: string
) {
  return self.map((_) => _.getOrElse(orElse))
}

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @ets_data_first someOrElse_
 */
export function someOrElse<B>(orElse: LazyArg<B>, __tsplusTrace?: string) {
  return <R, E, A>(self: Managed<R, E, Option<A>>): Managed<R, E, A | B> =>
    someOrElse_(self, orElse)
}
