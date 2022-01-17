import type { Managed } from "../definition"
import { zipWithPar_ } from "./zipWithPar"

/**
 * Parallelly zips this effect with the specified effect
 * returning the right side
 */
export function zipRightPar_<R, E, A, R2, E2, A2>(
  a: Managed<R, E, A>,
  b: Managed<R2, E2, A2>,
  __trace?: string
): Managed<R & R2, E | E2, A2> {
  return zipWithPar_(a, b, (_, a) => a, __trace)
}

/**
 * Parallelly zips this effect with the specified effect
 * returning the right side
 *
 * @ets_data_first zipRightPar_
 */
export function zipRightPar<R2, E2, A2>(b: Managed<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(a: Managed<R, E, A>) => zipRightPar_(a, b, __trace)
}
