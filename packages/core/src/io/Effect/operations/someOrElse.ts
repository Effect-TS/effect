import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { Effect } from "../definition"

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @tsplus fluent ets/Effect someOrElse
 */
export function someOrElse_<R, E, A, B>(
  self: Effect<R, E, Option<A>>,
  orElse: LazyArg<B>,
  __tsplusTrace?: string
): Effect<R, E, A | B> {
  return self.map((option) => option.getOrElse(orElse))
}

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @ets_data_first someOrElse_
 */
export function someOrElse<B>(orElse: LazyArg<B>, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, E, Option<A>>): Effect<R, E, A | B> =>
    self.someOrElse(orElse)
}
