// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as M from "../../../../Managed/index.js"
import type * as C from "../core.js"
import * as BroadcastedQueues from "./broadcastedQueues.js"
import * as FlattenTake from "./flattenTake.js"
import * as FromQueueWithShutdown from "./fromQueueWithShutdown.js"

/**
 * Fan out the stream, producing a list of streams that have the same
 * elements as this stream. The driver stream will only ever advance the
 * `maximumLag` chunks before the slowest downstream stream.
 */
export function broadcast_<R, E, A>(
  self: C.Stream<R, E, A>,
  n: number,
  maximumLag: number
): M.RIO<R, CK.Chunk<C.IO<E, A>>> {
  return M.map_(
    BroadcastedQueues.broadcastedQueues_(self, n, maximumLag),
    CK.map((_) =>
      FlattenTake.flattenTake(FromQueueWithShutdown.fromQueueWithShutdown_(_))
    )
  )
}

/**
 * Fan out the stream, producing a list of streams that have the same
 * elements as this stream. The driver stream will only ever advance the
 * `maximumLag` chunks before the slowest downstream stream.
 *
 * @ets_data_first broadcast_
 */
export function broadcast(n: number, maximumLag: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) => broadcast_(self, n, maximumLag)
}
