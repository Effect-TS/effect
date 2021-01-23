import * as SK from "../Sink"
import type { Stream } from "./definitions"
import { run_ } from "./run"

/**
 * Runs the stream to completion and yields the first value emitted by it,
 * discarding the rest of the elements.
 */
export function runHead<R, E, O>(self: Stream<R, E, O>) {
  return run_(self, SK.head<O>())
}
