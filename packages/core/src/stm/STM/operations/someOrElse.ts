import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { STM } from "../definition"

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @tsplus fluent ets/STM someOrElse
 */
export function someOrElse_<R, E, A, B>(
  self: STM<R, E, Option<A>>,
  orElse: LazyArg<B>
): STM<R, E, A | B> {
  return self.map((option) => option.getOrElse(orElse))
}

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @ets_data_first someOrElse_
 */
export function someOrElse<B>(orElse: LazyArg<B>) {
  return <R, E, A>(self: STM<R, E, Option<A>>): STM<R, E, A | B> =>
    self.someOrElse(orElse)
}
