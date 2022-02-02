// ets_tracing: off

import type * as C from "../core.js"
import * as FlattenPar from "./flattenPar.js"

/**
 * Like `flattenPar`, but executes all streams concurrently.
 */
export function flattenParUnbounded_<R, R1, E, E1, A>(
  self: C.Stream<R, E, C.Stream<R1, E1, A>>,
  outputBuffer = 16
): C.Stream<R & R1, E | E1, A> {
  return FlattenPar.flattenPar_(self, Number.MAX_SAFE_INTEGER, outputBuffer)
}

/**
 * Like `flattenPar`, but executes all streams concurrently.
 *
 * @ets_data_first flattenParUnbounded_
 */
export function flattenParUnbounded(outputBuffer = 16) {
  return <R, R1, E, E1, A>(self: C.Stream<R, E, C.Stream<R1, E1, A>>) =>
    flattenParUnbounded_(self, outputBuffer)
}
