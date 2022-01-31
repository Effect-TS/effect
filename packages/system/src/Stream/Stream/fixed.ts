// ets_tracing: off

import type * as CL from "../../Clock/index.js"
import type * as H from "../../Has/index.js"
import * as SC from "../../Schedule/index.js"
import type { Stream } from "./definitions.js"
import { schedule_ } from "./schedule.js"

/**
 * Emits elements of this stream with a fixed delay in between, regardless of how long it
 * takes to produce a value.
 */
export function fixed_<R, E, O>(
  self: Stream<R, E, O>,
  duration: number
): Stream<R & H.Has<CL.Clock>, E, O> {
  return schedule_(self, SC.fixed(duration))
}

/**
 * Emits elements of this stream with a fixed delay in between, regardless of how long it
 * takes to produce a value.
 */
export function fixed(duration: number) {
  return <R, E, O>(self: Stream<R, E, O>) => fixed_(self, duration)
}
