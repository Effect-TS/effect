// ets_tracing: off

import type * as T from "../_internal/effect.js"
import * as SK from "../Sink/index.js"
import type { Stream } from "./definitions.js"
import { run_ } from "./run.js"

/**
 * Runs the stream and emits the number of elements processed
 *
 * Equivalent to `run(ZSink.count)`
 */
export function runCount<R, E, O>(self: Stream<R, E, O>): T.Effect<R, E, number> {
  return run_(self, SK.count)
}
