// ets_tracing: off

import type { Stream } from "./definitions.js"
import { flattenPar_ } from "./flattenPar.js"

/**
 * Like `flattenPar`, but executes all streams concurrently.
 */
export function flattenParUnbounded<R, R1, E, E1, O1>(
  self: Stream<R, E, Stream<R1, E1, O1>>,
  outputBuffer = 16
): Stream<R & R1, E | E1, O1> {
  return flattenPar_(self, Number.MAX_SAFE_INTEGER, outputBuffer)
}
