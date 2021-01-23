import { pipe } from "../../Function"
import * as Q from "../../Queue"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type * as TK from "../Take"
import type { Stream } from "./definitions"
import { intoManaged_ } from "./intoManaged"

/**
 * Converts the stream to a managed queue of chunks. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 */
export function toQueue_<R, E, O>(
  self: Stream<R, E, O>,
  capacity: number
): M.Managed<R, never, Q.Dequeue<TK.Take<E, O>>> {
  return pipe(
    M.do,
    M.bind("queue", () =>
      T.toManaged_(Q.makeBounded<TK.Take<E, O>>(capacity), (q) => q.shutdown)
    ),
    M.tap(({ queue }) => M.fork(intoManaged_(self, queue))),
    M.map(({ queue }) => queue)
  )
}

/**
 * Converts the stream to a managed queue of chunks. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 */
export function toQueue(capacity: number) {
  return <R, E, O>(self: Stream<R, E, O>) => toQueue_(self, capacity)
}
