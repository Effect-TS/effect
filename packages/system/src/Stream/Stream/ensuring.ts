import type * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import { Stream } from "./definitions"

/**
 * Executes the provided finalizer after this stream's finalizers run.
 */
export function ensuring_<R, R1, E, O>(
  self: Stream<R, E, O>,
  fin: T.Effect<R1, never, any>
): Stream<R & R1, E, O> {
  return new Stream(M.ensuring_(self.proc, fin))
}

/**
 * Executes the provided finalizer after this stream's finalizers run.
 */
export function ensuring<R1>(fin: T.Effect<R1, never, any>) {
  return <R, E, O>(self: Stream<R, E, O>) => ensuring_(self, fin)
}
