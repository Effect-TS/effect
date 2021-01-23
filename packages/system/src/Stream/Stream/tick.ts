import type * as CL from "../../Clock"
import * as SC from "../../Schedule"
import type { Stream } from "./definitions"
import { repeatValueWith } from "./repeatValueWith"

/**
 * A stream that emits Unit values spaced by the specified duration.
 */
export function tick(interval: number): Stream<CL.HasClock, never, void> {
  return repeatValueWith(() => undefined, SC.spaced(interval))
}
