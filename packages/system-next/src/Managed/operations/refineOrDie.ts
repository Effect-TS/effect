// ets_tracing: off

import { identity } from "../../Function"
import type { Option } from "../../Option"
import type { Managed } from "../definition"
import { refineOrDieWith_ } from "./refineOrDieWith"

/**
 * Keeps some of the errors, and terminates the fiber with the rest.
 */
export function refineOrDie_<R, A, E, E1>(
  self: Managed<R, E, A>,
  pf: (e: E) => Option<E1>,
  __trace?: string
) {
  return refineOrDieWith_(self, pf, identity, __trace)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest.
 *
 * @ets_data_first refineOrDie_
 */
export function refineOrDie<E, E1>(pf: (e: E) => Option<E1>, __trace?: string) {
  return <R, A>(self: Managed<R, E, A>) => refineOrDie_(self, pf, __trace)
}
