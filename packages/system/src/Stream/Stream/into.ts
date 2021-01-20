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
export function into_<R, R1, E, O>(
  self: Stream<R, E, O>,
  queue: Q.XQueue<R1, unknown, never, unknown, Take.Take<E, O>, unknown>
) {
  return M.use_(intoManaged_(self, queue), () => T.unit)
}

/**
 * Enqueues elements of this stream into a queue. Stream failure and ending will also be
 * signalled.
 */
export function into<R1, E, O>(
  queue: Q.XQueue<R1, unknown, never, unknown, Take.Take<E, O>, unknown>
) {
  return <R>(self: Stream<R, E, O>) => into_(self, queue)
}
