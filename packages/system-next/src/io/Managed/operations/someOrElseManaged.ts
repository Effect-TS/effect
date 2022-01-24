import * as O from "../../../data/Option"
import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { succeedNow } from "./succeedNow"

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 */
export function someOrElseManaged_<R, E, A, R1, E1, B>(
  self: Managed<R, E, O.Option<A>>,
  orElse: Managed<R1, E1, B>,
  __trace?: string
) {
  return chain_(
    self,
    O.fold((): Managed<R1, E1, A | B> => orElse, succeedNow),
    __trace
  )
}

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @ets_data_first someOrElseManaged_
 */
export function someOrElseManaged<R1, E1, B>(
  orElse: Managed<R1, E1, B>,
  __trace?: string
) {
  return <R, E, A>(self: Managed<R, E, O.Option<A>>) =>
    someOrElseManaged_(self, orElse, __trace)
}
