// ets_tracing: off

import type { Managed } from "../definition"
import { zipWithPar_ } from "./zipWithPar"

/**
 * Parallelly zips this effect with the specified effect
 * returning the left side
 */
export function zipLeftPar_<R, E, A, R2, E2, A2>(
  a: Managed<R, E, A>,
  b: Managed<R2, E2, A2>,
  __trace?: string
): Managed<R & R2, E | E2, A> {
  return zipWithPar_(a, b, (a) => a, __trace)
}

/**
 * Parallelly zips this effect with the specified effect
 * returning the left side
 *
 * @ets_data_first zipLeftPar_
 */
export function zipLeftPar<R2, E2, A2>(b: Managed<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(a: Managed<R, E, A>) => zipLeftPar_(a, b, __trace)
}
