// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as M from "../_internal/managed.js"
import { broadcastedQueues_ } from "./broadcastedQueues.js"
import type { Stream } from "./definitions.js"
import { flattenTake } from "./flattenTake.js"
import { fromQueueWithShutdown } from "./fromQueueWithShutdown.js"

/**
 * Fan out the stream, producing a list of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcast(n: number, maximumLag: number) {
  return <R, E, O>(self: Stream<R, E, O>) => broadcast_(self, n, maximumLag)
}

/**
 * Fan out the stream, producing a list of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcast_<R, E, O>(
  self: Stream<R, E, O>,
  n: number,
  maximumLag: number
): M.Managed<R, never, A.Chunk<Stream<unknown, E, O>>> {
  return M.map_(
    broadcastedQueues_(self, n, maximumLag),
    A.map((q) => flattenTake(fromQueueWithShutdown(q)))
  )
}
