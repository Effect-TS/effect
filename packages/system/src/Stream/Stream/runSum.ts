// ets_tracing: off

import * as SK from "../Sink/index.js"
import type { Stream } from "./definitions.js"
import { run_ } from "./run.js"

/**
 * Runs the stream to completion and yields the last value emitted by it,
 * discarding the rest of the elements.
 */
export function runSum<R, E>(self: Stream<R, E, number>) {
  return run_(self, SK.sum)
}
