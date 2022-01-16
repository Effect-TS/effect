// ets_tracing: off

import type { Managed } from "../definition"
import { zipWith_ } from "./zipWith"

/**
 * Sequentially zips this effect with the specified effect
 * returning the right side
 */
export function zipRight_<R, E, A, R2, E2, A2>(
  a: Managed<R, E, A>,
  b: Managed<R2, E2, A2>,
  __trace?: string
): Managed<R & R2, E | E2, A2> {
  return zipWith_(a, b, (_, a) => a, __trace)
}

/**
 * Sequentially zips this effect with the specified effect
 * returning the right side
 *
 * @ets_data_first zipRight_
 */
export function zipRight<R2, E2, A2>(b: Managed<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(a: Managed<R, E, A>) => zipRight_(a, b, __trace)
}
