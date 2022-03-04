import type { LazyArg } from "../../../data/Function"
import { identity } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { STM } from "../definition"

/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @tsplus fluent ets/STM flattenErrorOption
 */
export function flattenErrorOption_<R, E, A, E2>(
  self: STM<R, Option<E>, A>,
  def: LazyArg<E2>
): STM<R, E | E2, A> {
  return self.mapError((option) => option.fold(def, identity))
}

/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @ets_data_first flattenErrorOption_
 */
export function flattenErrorOption<E2>(def: LazyArg<E2>) {
  return <R, E, A>(self: STM<R, Option<E>, A>): STM<R, E | E2, A> =>
    self.flattenErrorOption(def)
}
