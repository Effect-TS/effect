import { identity } from "../../../data/Function"
import type * as O from "../../../data/Option"
import type { Effect } from "../definition"
import { refineOrDieWith_ } from "./refineOrDieWith"

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @ets fluent ets/Effect refineOrDie
 */
export function refineOrDie_<R, A, E, E1>(
  self: Effect<R, E, A>,
  pf: (e: E) => O.Option<E1>,
  __etsTrace?: string
) {
  return refineOrDieWith_(self, pf, identity, __etsTrace)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @ets_data_first refineOrDie_
 */
export function refineOrDie<E, E1>(pf: (e: E) => O.Option<E1>, __etsTrace?: string) {
  return <R, A>(self: Effect<R, E, A>) => refineOrDie_(self, pf, __etsTrace)
}
