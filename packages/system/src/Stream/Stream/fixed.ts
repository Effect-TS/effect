import type * as CL from "../../Clock"
import type * as H from "../../Has"
import * as SC from "../../Schedule"
import type { Stream } from "./definitions"
import { schedule_ } from "./schedule"

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
