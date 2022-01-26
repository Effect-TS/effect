import type { LazyArg } from "../../../data/Function"
import * as O from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @ets fluent ets/Managed someOrElseManaged
 */
export function someOrElseManaged_<R, E, A, R1, E1, B>(
  self: Managed<R, E, O.Option<A>>,
  orElse: LazyArg<Managed<R1, E1, B>>,
  __etsTrace?: string
) {
  return self.flatMap(O.fold(orElse, Managed.succeedNow))
}

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @ets_data_first someOrElseManaged_
 */
export function someOrElseManaged<R1, E1, B>(
  orElse: LazyArg<Managed<R1, E1, B>>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Managed<R, E, O.Option<A>>) => someOrElseManaged_(self, orElse)
}
