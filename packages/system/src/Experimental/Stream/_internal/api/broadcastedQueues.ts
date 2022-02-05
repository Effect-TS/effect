// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import { pipe } from "../../../../Function/index.js"
import * as H from "../../../../Hub/index.js"
import * as M from "../../../../Managed/index.js"
import type * as TK from "../../Take/index.js"
import type * as C from "../core.js"
import * as RunIntoHubManaged from "./runIntoHubManaged.js"

/**
 * Converts the stream to a managed list of queues. Every value will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueues_<R, E, A>(
  self: C.Stream<R, E, A>,
  n: number,
  maximumLag: number
): M.RIO<R, CK.Chunk<H.HubDequeue<unknown, never, TK.Take<E, A>>>> {
  return pipe(
    M.do,
    M.bind("hub", () => T.toManaged(H.makeBounded<TK.Take<E, A>>(maximumLag))),
    M.bind("queues", ({ hub }) => M.collectAll(CK.fill(n, () => H.subscribe(hub)))),
    M.tap(({ hub }) => M.fork(RunIntoHubManaged.runIntoHubManaged_(self, hub))),
    M.map(({ queues }) => queues)
  )
}

/**
 * Converts the stream to a managed list of queues. Every value will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 *
 * @ets_data_first broadcastedQueues_
 */
export function broadcastedQueues(n: number, maximumLag: number) {
  return <R, E, A>(self: C.Stream<R, E, A>) => broadcastedQueues_(self, n, maximumLag)
}
