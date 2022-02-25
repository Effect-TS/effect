import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { Effect } from "../definition"

/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @tsplus fluent ets/Effect flattenErrorOption
 */
export function flattenErrorOption_<R, E, E1, A>(
  self: Effect<R, Option<E>, A>,
  def: LazyArg<E1>,
  __tsplusTrace?: string
): Effect<R, E | E1, A> {
  return self.mapError((e) => e.getOrElse(def))
}

/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @ets_data_first flattenErrorOption_
 */
export function flattenErrorOption<E1>(def: LazyArg<E1>, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, Option<E>, A>): Effect<R, E | E1, A> =>
    self.flattenErrorOption(def)
}
