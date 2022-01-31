// ets_tracing: off

import type * as CL from "../../../../Clock/index.js"
import type * as C from "../core.js"
import * as Fail from "./fail.js"
import * as TimeoutTo from "./timeoutTo.js"

/**
 * Fails the stream with given error if it does not produce a value after d duration.
 */
export function timeoutFail_<R, E, E1, A>(
  self: C.Stream<R, E, A>,
  e: E1,
  d: number
): C.Stream<R & CL.HasClock, E | E1, A> {
  return TimeoutTo.timeoutTo_(self, d, Fail.fail(e))
}

/**
 * Fails the stream with given error if it does not produce a value after d duration.
 *
 * @ets_data_first timeoutFail_
 */
export function timeoutFail<E1>(e: E1, d: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) => timeoutFail_(self, e, d)
}
