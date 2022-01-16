// ets_tracing: off

import type { Managed } from "../definition"
import { zipWith_ } from "./zipWith"

/**
 * Sequentially zips this effect with the specified effect
 * returning the left side
 */
export function zipLeft_<R, E, A, R2, E2, A2>(
  a: Managed<R, E, A>,
  b: Managed<R2, E2, A2>,
  __trace?: string
): Managed<R & R2, E | E2, A> {
  return zipWith_(a, b, (a) => a, __trace)
}

/**
 * Sequentially zips this effect with the specified effect
 * returning the left side
 *
 * @ets_data_first zipLeft_
 */
export function zipLeft<R2, E2, A2>(b: Managed<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(a: Managed<R, E, A>): Managed<R & R2, E | E2, A> =>
    zipLeft_(a, b, __trace)
}
