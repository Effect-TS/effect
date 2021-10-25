// ets_tracing: off

import type * as CL from "../../../../Clock"
import * as SC from "../../../../Schedule"
import type * as C from "../core"
import * as RepeatValueWith from "./repeatValueWith"

/**
 * A stream that emits Unit values spaced by the specified duration.
 */
export function tick(interval: number): C.Stream<CL.HasClock, never, void> {
  return RepeatValueWith.repeatValueWith(undefined, SC.spaced(interval))
}
