// ets_tracing: off

import * as Q from "../../../Queue"
import type * as C from "./core"
import * as ForEachChunk from "./forEachChunk"

/**
 * Create a sink which enqueues each element into the specified queue.
 */
export function fromQueue<R, InErr, E, I>(
  queue: Q.XEnqueue<R, E, I>
): C.Sink<R, InErr, I, InErr | E, unknown, void> {
  return ForEachChunk.forEachChunk<R, InErr, InErr | E, I, void>((_) =>
    Q.offerAll_(queue, _)
  )
}
