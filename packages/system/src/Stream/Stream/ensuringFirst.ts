// ets_tracing: off

import type * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import { Stream } from "./definitions.js"

/**
 * Executes the provided finalizer before this stream's finalizers run.
 */
export function ensuringFirst<R1>(fin: T.Effect<R1, never, unknown>) {
  return <R, E, O>(self: Stream<R, E, O>) => ensuringFirst_(self, fin)
}

/**
 * Executes the provided finalizer before this stream's finalizers run.
 */
export function ensuringFirst_<R, E, O, R1>(
  self: Stream<R, E, O>,
  fin: T.Effect<R1, never, unknown>
) {
  return new Stream<R & R1, E, O>(M.ensuringFirst_(self.proc, fin))
}
