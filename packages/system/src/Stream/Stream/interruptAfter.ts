// ets_tracing: off

import * as CL from "../../Clock/index.js"
import type * as H from "../../Has/index.js"
import type { Stream } from "./definitions.js"
import { interruptWhen_ } from "./interruptWhen.js"

/**
 * Specialized version of interruptWhen which interrupts the evaluation of this stream
 * after the given duration.
 */
export function interruptAfter_<R, E, O>(
  self: Stream<R, E, O>,
  duration: number
): Stream<R & H.Has<CL.Clock>, E, O> {
  return interruptWhen_(self, CL.sleep(duration))
}

/**
 * Specialized version of interruptWhen which interrupts the evaluation of this stream
 * after the given duration.
 */
export function interruptAfter(duration: number) {
  return <R, E, O>(self: Stream<R, E, O>) => interruptAfter_(self, duration)
}
