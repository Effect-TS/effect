// ets_tracing: off

import { pipe } from "../../Function/index.js"
import type * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import type * as SK from "../Sink/index.js"
import type { Stream } from "./definitions.js"
import { runManaged } from "./runManaged.js"

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function run_<R, R1, E, E1, O, B>(
  self: Stream<R, E, O>,
  sink: SK.Sink<R1, E1, O, any, B>
): T.Effect<R & R1, E1 | E, B> {
  return pipe(self, runManaged(sink), M.useNow)
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function run<R1, E1, O, B>(sink: SK.Sink<R1, E1, O, any, B>) {
  return <R, E>(self: Stream<R, E, O>) => run_(self, sink)
}
