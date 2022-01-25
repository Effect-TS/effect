import { identity } from "../../../data/Function"
import type * as O from "../../../data/Option"
import type { Effect } from "../definition"
import { unrefineWith_ } from "./unrefineWith"

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @ets fluent ets/Effect unrefine
 */
export function unrefine_<R, E, A, E1>(
  fa: Effect<R, E, A>,
  pf: (u: unknown) => O.Option<E1>,
  __etsTrace?: string
) {
  return unrefineWith_(fa, pf, identity, __etsTrace)
}

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @ets_data_first unrefine_
 */
export function unrefine<E1>(pf: (u: unknown) => O.Option<E1>, __etsTrace?: string) {
  return <R, E, A>(fa: Effect<R, E, A>) => unrefine_(fa, pf, __etsTrace)
}
