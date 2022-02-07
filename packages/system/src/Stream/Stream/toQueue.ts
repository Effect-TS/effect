// ets_tracing: off

import { pipe } from "../../Function/index.js"
import * as Q from "../../Queue/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import type * as TK from "../Take/index.js"
import type { Stream } from "./definitions.js"
import { intoManaged_ } from "./intoManaged.js"

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
      T.toManagedRelease_(Q.makeBounded<TK.Take<E, O>>(capacity), Q.shutdown)
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
