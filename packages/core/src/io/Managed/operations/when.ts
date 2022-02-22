import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * The moral equivalent of `if (p) exp`.
 *
 * @tsplus fluent ets/Managed when
 */
export function when_<R, E, A>(
  self: Managed<R, E, A>,
  b: LazyArg<boolean>,
  __etsTrace?: string
): Managed<R, E, Option<A>> {
  return Managed.suspend(b() ? self.asSome() : Managed.none)
}

/**
 * The moral equivalent of `if (p) exp`
 *
 * @ets_data_first when_
 */
export function when(b: LazyArg<boolean>, __etsTrace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R, E, Option<A>> => when_(self, b)
}
