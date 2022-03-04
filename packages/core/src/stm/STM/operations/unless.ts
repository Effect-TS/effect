import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { STM } from "../definition"

/**
 * The moral equivalent of `if (!p) exp`
 *
 * @tsplus fluent ets/STM unless
 */
export function unless_<R, E, A>(
  self: STM<R, E, A>,
  predicate: LazyArg<boolean>
): STM<R, E, Option<A>> {
  return STM.suspend(predicate() ? STM.none : self.asSome())
}

/**
 * The moral equivalent of `if (!p) exp`
 *
 * @ets_data_first unless_
 */
export function unless(predicate: LazyArg<boolean>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R, E, Option<A>> => self.unless(predicate)
}
