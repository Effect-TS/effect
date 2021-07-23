// ets_tracing: off

import { pipe } from "../../Function"
import * as M from "../_internal/managed"
import { broadcastedQueuesDynamic_ } from "./broadcastedQueuesDynamic"
import type { Stream } from "./definitions"
import { flattenTake } from "./flattenTake"
import { fromQueueWithShutdown } from "./fromQueueWithShutdown"

/**
 * Fan out the stream, producing a dynamic number of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcastDynamic_<R, E, O>(
  self: Stream<R, E, O>,
  maximumLag: number
): M.Managed<R, never, M.Managed<unknown, never, Stream<unknown, E, O>>> {
  return pipe(
    broadcastedQueuesDynamic_(self, maximumLag),
    M.map(M.map((_) => flattenTake(fromQueueWithShutdown(_))))
  )
}

/**
 * Fan out the stream, producing a dynamic number of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcastDynamic(maximumLag: number) {
  return <R, E, O>(self: Stream<R, E, O>) => broadcastDynamic_(self, maximumLag)
}
