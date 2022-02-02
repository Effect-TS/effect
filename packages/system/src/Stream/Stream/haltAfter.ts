// ets_tracing: off

import * as CL from "../../Clock/index.js"
import type * as H from "../../Has/index.js"
import type { Stream } from "./definitions.js"
import { haltWhen_ } from "./haltWhen.js"

/**
 * Specialized version of haltWhen which halts the evaluation of this stream
 * after the given duration.
 *
 * An element in the process of being pulled will not be interrupted when the
 * given duration completes. See `interruptAfter` for this behavior.
 */
export function haltAfter_<R, E, O>(
  self: Stream<R, E, O>,
  duration: number
): Stream<H.Has<CL.Clock> & R, E, O> {
  return haltWhen_(self, CL.sleep(duration))
}

/**
 * Specialized version of haltWhen which halts the evaluation of this stream
 * after the given duration.
 *
 * An element in the process of being pulled will not be interrupted when the
 * given duration completes. See `interruptAfter` for this behavior.
 */
export function haltAfter(duration: number) {
  return <R, E, O>(self: Stream<R, E, O>) => haltAfter_(self, duration)
}
