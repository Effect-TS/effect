// ets_tracing: off

import { pipe } from "../../../../Function"
import * as M from "../../../../Managed"
import type * as C from "../core"
import * as BroadcastedQueuesDynamic from "./broadcastedQueuesDynamic"
import * as Chain from "./chain"
import * as FlattenTake from "./flattenTake"
import * as FromQueue from "./fromQueue"
import * as Managed from "./managed"

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
