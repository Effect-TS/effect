// ets_tracing: off

import { pipe } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import type * as C from "../core.js"
import * as BroadcastedQueuesDynamic from "./broadcastedQueuesDynamic.js"
import * as Chain from "./chain.js"
import * as FlattenTake from "./flattenTake.js"
import * as FromQueue from "./fromQueue.js"
import * as Managed from "./managed.js"

/**
 * Fan out the stream, producing a dynamic number of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcastDynamic_<R, E, A>(
  self: C.Stream<R, E, A>,
  maximumLag: number
): M.RIO<R, C.IO<E, A>> {
  return M.map_(
    BroadcastedQueuesDynamic.broadcastedQueuesDynamic_(self, maximumLag),
    (_) =>
      pipe(
        Managed.managed(_),
        Chain.chain(FromQueue.fromQueue()),
        FlattenTake.flattenTake
      )
  )
}

/**
 * Fan out the stream, producing a dynamic number of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 *
 * @ets_data_first broadcastDynamic_
 */
export function broadcastDynamic(maximumLag: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) => broadcastDynamic_(self, maximumLag)
}
