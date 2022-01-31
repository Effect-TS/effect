// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as ScanReduceEffect from "./scanReduceEffect.js"

/**
 * Statefully maps over the elements of this stream to produce all intermediate results.
 *
 * See also `Stream#scan`.
 */
export function scanReduce_<R, E, A, A1 extends A>(
  self: C.Stream<R, E, A>,
  f: (a1: A1, a: A) => A1
): C.Stream<R, E, A1> {
  return ScanReduceEffect.scanReduceEffect_(self, (curr, next) =>
    T.succeed(f(curr, next))
  )
}

/**
 * Statefully maps over the elements of this stream to produce all intermediate results.
 *
 * See also `Stream#scan`.
 *
 * @ets_data_first scanReduce_
 */
export function scanReduce<A, A1 extends A>(f: (a1: A1, a: A) => A1) {
  return <R, E>(self: C.Stream<R, E, A>) => scanReduce_(self, f)
}
