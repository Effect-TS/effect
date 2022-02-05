// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple/index.js"
import type { Effect } from "./effect.js"
import { zipWithPar_ } from "./zipWithPar.js"

/**
 * Parallely zips this effects
 */
export function zipPar_<R, E, A, R2, E2, A2>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E | E2, Tp.Tuple<[A, A2]>> {
  return zipWithPar_(a, b, Tp.tuple, __trace)
}

/**
 * Parallely zips this effects
 */
export function zipPar<R2, E2, A2>(b: Effect<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(a: Effect<R, E, A>): Effect<R & R2, E | E2, Tp.Tuple<[A, A2]>> =>
    zipPar_(a, b, __trace)
}
