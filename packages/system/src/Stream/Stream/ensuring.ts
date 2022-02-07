// ets_tracing: off

import type * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import { Stream } from "./definitions.js"

/**
 * Executes the provided finalizer after this stream's finalizers run.
 */
export function ensuring_<R, R1, E, O, X>(
  self: Stream<R, E, O>,
  fin: T.Effect<R1, never, X>
): Stream<R & R1, E, O> {
  return new Stream(M.ensuring_(self.proc, fin))
}

/**
 * Executes the provided finalizer after this stream's finalizers run.
 */
export function ensuring<R1, X>(fin: T.Effect<R1, never, X>) {
  return <R, E, O>(self: Stream<R, E, O>) => ensuring_(self, fin)
}
