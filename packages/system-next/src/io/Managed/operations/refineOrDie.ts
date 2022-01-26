import { identity } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { Managed } from "../definition"

/**
 * Keeps some of the errors, and terminates the fiber with the rest.
 *
 * @ets fluent ets/Managed refineOrDie
 */
export function refineOrDie_<R, A, E, E1>(
  self: Managed<R, E, A>,
  pf: (e: E) => Option<E1>,
  __etsTrace?: string
) {
  return self.refineOrDieWith(pf, identity)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest.
 *
 * @ets_data_first refineOrDie_
 */
export function refineOrDie<E, E1>(pf: (e: E) => Option<E1>, __etsTrace?: string) {
  return <R, A>(self: Managed<R, E, A>) => refineOrDie_(self, pf)
}
