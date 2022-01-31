// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as H from "../../Hub/index.js"
import type * as XQ from "../../Queue/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import type * as Take from "../Take/index.js"
import type { Stream } from "./definitions.js"
import { intoHubManaged_ } from "./intoHubManaged.js"

/**
 * Converts the stream to a managed list of queues. Every value will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 * The downstream queues will be provided with chunks in the same order they are returned, so
 * the fastest queue might have seen up to (`maximumLag` + 1) chunks more than the slowest queue if it
 * has a lower index than the slowest queue.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueues(n: number, maximumLag: number) {
  return <R, E, O>(self: Stream<R, E, O>) => broadcastedQueues_(self, n, maximumLag)
}

/**
 * Converts the stream to a managed list of queues. Every value will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 * The downstream queues will be provided with chunks in the same order they are returned, so
 * the fastest queue might have seen up to (`maximumLag` + 1) chunks more than the slowest queue if it
 * has a lower index than the slowest queue.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueues_<R, E, O>(
  self: Stream<R, E, O>,
  n: number,
  maximumLag: number
): M.Managed<R, never, A.Chunk<XQ.Dequeue<Take.Take<E, O>>>> {
  return pipe(
    M.do,
    M.bind("hub", () => T.toManaged(H.makeBounded<Take.Take<E, O>>(maximumLag))),
    M.bind("queues", ({ hub }) =>
      M.collectAll(Array.from({ length: n }, () => H.subscribe(hub)))
    ),
    M.tap(({ hub }) => M.fork(intoHubManaged_(self, hub))),
    M.map(({ queues }) => A.from(queues))
  )
}
