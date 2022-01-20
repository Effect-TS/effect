import { identity } from "../../Function"
import type * as O from "../../Option"
import type { Effect } from "../definition"
import { unrefineWith_ } from "./unrefineWith"

/**
 * Takes some fiber failures and converts them into errors.
 */
export function unrefine_<R, E, A, E1>(
  fa: Effect<R, E, A>,
  pf: (u: unknown) => O.Option<E1>,
  __trace?: string
) {
  return unrefineWith_(fa, pf, identity, __trace)
}

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @ets_data_first unrefine_
 */
export function unrefine<E1>(pf: (u: unknown) => O.Option<E1>, __trace?: string) {
  return <R, E, A>(fa: Effect<R, E, A>) => unrefine_(fa, pf, __trace)
}
