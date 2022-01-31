// ets_tracing: off

import * as CL from "../../../../Clock/index.js"
import type * as C from "../core.js"
import * as HaltWhen from "./haltWhen.js"

/**
 * Specialized version of haltWhen which halts the evaluation of this stream
 * after the given duration.
 *
 * An element in the process of being pulled will not be interrupted when the
 * given duration completes. See `interruptAfter` for this behavior.
 */
export function halfAfter_<R, E, A>(
  self: C.Stream<R, E, A>,
  duration: number
): C.Stream<CL.HasClock & R, E, A> {
  return HaltWhen.haltWhen_(self, CL.sleep(duration))
}

/**
 * Specialized version of haltWhen which halts the evaluation of this stream
 * after the given duration.
 *
 * An element in the process of being pulled will not be interrupted when the
 * given duration completes. See `interruptAfter` for this behavior.
 *
 * @ets_data_first haltAfter_
 */
export function halfAfter(duration: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) => halfAfter_(self, duration)
}
