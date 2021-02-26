import type { HasClock } from "../../Clock/definition"
import * as SC from "../../Schedule"
import type { Stream } from "./definitions"
import { repeatValueWith } from "./repeatValueWith"

/**
 * A stream that emits Unit values spaced by the specified duration.
 */
export function tick(interval: number): Stream<HasClock, never, void> {
  return repeatValueWith(() => undefined, SC.spaced(interval))
}
