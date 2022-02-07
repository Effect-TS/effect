// ets_tracing: off

import { pipe } from "../../Function/index.js"
import * as M from "../_internal/managed.js"
import { broadcastedQueuesDynamic_ } from "./broadcastedQueuesDynamic.js"
import { chain_ } from "./chain.js"
import type { Stream } from "./definitions.js"
import { flattenTake } from "./flattenTake.js"
import { fromQueue } from "./fromQueue.js"
import { managed } from "./managed.js"

/**
 * Fan out the stream, producing a dynamic number of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcastDynamic_<R, E, O>(
  self: Stream<R, E, O>,
  maximumLag: number
): M.Managed<R, never, Stream<unknown, E, O>> {
  return pipe(
    broadcastedQueuesDynamic_(self, maximumLag),
    M.map((_) => flattenTake(chain_(managed(_), fromQueue)))
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
