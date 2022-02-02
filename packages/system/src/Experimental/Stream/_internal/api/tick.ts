// ets_tracing: off

import type * as CL from "../../../../Clock/index.js"
import * as SC from "../../../../Schedule/index.js"
import type * as C from "../core.js"
import * as RepeatValueWith from "./repeatValueWith.js"

/**
 * A stream that emits Unit values spaced by the specified duration.
 */
export function tick(interval: number): C.Stream<CL.HasClock, never, void> {
  return RepeatValueWith.repeatValueWith(undefined, SC.spaced(interval))
}
