// ets_tracing: off

import * as CL from "../../../../Clock/index.js"
import type * as C from "../core.js"
import * as InterruptWhen from "./interruptWhen.js"

/**
 * Specialized version of interruptWhen which interrupts the evaluation of this stream
 * after the given duration.
 */
export function interruptAfter_<R, E, A>(
  self: C.Stream<R, E, A>,
  duration: number
): C.Stream<CL.HasClock & R, E, A> {
  return InterruptWhen.interruptWhen_(self, CL.sleep(duration))
}

/**
 * Specialized version of interruptWhen which interrupts the evaluation of this stream
 * after the given duration.
 *
 * @ets_data_first interruptAfter_
 */
export function interruptAfter(duration: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) => interruptAfter_(self, duration)
}
