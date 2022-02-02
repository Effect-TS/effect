// ets_tracing: off

import type * as CL from "../../../../Clock"
import * as SC from "../../../../Schedule"
import type * as C from "../core"
import * as Schedule from "./schedule"

/**
 * Emits elements of this stream with a fixed delay in between, regardless of how long it
 * takes to produce a value.
 */
export function fixed_<R, E, A>(
  self: C.Stream<R, E, A>,
  duration: number
): C.Stream<R & CL.HasClock, E, A> {
  return Schedule.schedule_(self, SC.fixed(duration))
}

/**
 * Emits elements of this stream with a fixed delay in between, regardless of how long it
 * takes to produce a value.
 *
 * @ets_data_first fixed_
 */
export function fixed(duration: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) => fixed_(self, duration)
}
