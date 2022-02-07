// ets_tracing: off

import type * as CL from "../../Clock/index.js"
import * as SC from "../../Schedule/index.js"
import type { Stream } from "./definitions.js"
import { repeatValueWith } from "./repeatValueWith.js"

/**
 * A stream that emits Unit values spaced by the specified duration.
 */
export function tick(interval: number): Stream<CL.HasClock, never, void> {
  return repeatValueWith(() => undefined, SC.spaced(interval))
}
