import type * as T from "../_internal/effect"
import * as SK from "../Sink"
import type { Stream } from "./definitions"
import { run_ } from "./run"

/**
 * Runs the stream and emits the number of elements processed
 *
 * Equivalent to `run(ZSink.count)`
 */
export function runCount<R, E, O>(self: Stream<R, E, O>): T.Effect<R, E, number> {
  return run_(self, SK.count)
}
