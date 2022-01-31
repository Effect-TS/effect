import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * The moral equivalent of `if (!p) exp`.
 *
 * @tsplus fluent ets/Managed unless
 */
export function unless_<R, E, A>(
  self: Managed<R, E, A>,
  b: LazyArg<boolean>,
  __etsTrace?: string
): Managed<R, E, Option<A>> {
  return Managed.suspend(b() ? Managed.none : self.asSome())
}

/**
 * The moral equivalent of `if (!p) exp`.
 *
 * @ets_data_first unless_
 */
export function unless(b: LazyArg<boolean>, __etsTrace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R, E, Option<A>> => unless_(self, b)
}
