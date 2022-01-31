// ets_tracing: off

import type * as C from "../core.js"
import * as Merge from "./merge.js"

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when the specified stream terminates.
 */
export function mergeTerminateRight_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>
): C.Stream<R1 & R, E | E1, A | A1> {
  return Merge.merge_(self, that, "Right")
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when the specified stream terminates.
 * @ets_data_first mergeTerminateRight_
 */
export function mergeTerminateRight<R1, E1, A1>(that: C.Stream<R1, E1, A1>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => mergeTerminateRight_(self, that)
}
