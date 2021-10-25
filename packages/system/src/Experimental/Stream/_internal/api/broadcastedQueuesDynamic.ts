// ets_tracing: off

import * as H from "../../../../Hub"
import * as M from "../../../../Managed"
import type * as TK from "../../Take"
import type * as C from "../core"
import * as ToHub from "./toHub"

/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueuesDynamic_<R, E, A>(
  self: C.Stream<R, E, A>,
  maximumLag: number
): M.RIO<R, M.UIO<H.HubDequeue<unknown, never, TK.Take<E, A>>>> {
  return M.map_(ToHub.toHub_(self, maximumLag), (_) => H.subscribe(_))
}

/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 *
 * @ets_data_first broadcastedQueuesDynamic_
 */
export function broadcastedQueuesDynamic(maximumLag: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) =>
    broadcastedQueuesDynamic_(self, maximumLag)
}
