// ets_tracing: off

import type * as Q from "../../Queue"
import type * as Take from "../../Stream/Take"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type { Stream } from "./definitions"
import { intoManaged_ } from "./intoManaged"

/**
 * Enqueues elements of this stream into a queue. Stream failure and ending will also be
 * signalled.
 */
export function into_<R, E, O>(
  self: Stream<R, E, O>,
  queue: Q.XQueue<R, never, never, unknown, Take.Take<E, O>, unknown>
): T.Effect<R, E, void> {
  return M.use_(intoManaged_(self, queue), () => T.unit)
}

/**
 * Enqueues elements of this stream into a queue. Stream failure and ending will also be
 * signalled.
 */
export function into<R, E, O>(
  queue: Q.XQueue<R, never, never, unknown, Take.Take<E, O>, unknown>
) {
  return (self: Stream<R, E, O>) => into_(self, queue)
}
