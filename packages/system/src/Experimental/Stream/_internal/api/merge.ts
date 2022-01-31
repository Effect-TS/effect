// ets_tracing: off

import { identity } from "../../../../Function/index.js"
import type * as C from "../core.js"
import * as MergeWith from "./mergeWith.js"

/**
 * Merges this stream and the specified stream together.
 *
 * New produced stream will terminate when both specified stream terminate if no termination
 * strategy is specified.
 */
export function merge_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>,
  strategy: MergeWith.TerminationStrategy = "Both"
): C.Stream<R1 & R, E | E1, A | A1> {
  return MergeWith.mergeWith(self, that, identity, identity, strategy)
}

/**
 * Merges this stream and the specified stream together.
 *
 * New produced stream will terminate when both specified stream terminate if no termination
 * strategy is specified.
 *
 * @ets_data_first merge_
 */
export function merge<R1, E1, A1>(
  that: C.Stream<R1, E1, A1>,
  strategy: MergeWith.TerminationStrategy = "Both"
) {
  return <R, E, A>(self: C.Stream<R, E, A>) => merge_(self, that, strategy)
}
