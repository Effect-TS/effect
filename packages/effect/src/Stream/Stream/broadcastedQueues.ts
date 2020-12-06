import type * as A from "../../Chunk"
import type * as Ex from "../../Exit"
import * as O from "../../Option"
import type * as XQ from "../../Queue"
import * as T from "../_internal/effect"
import type * as M from "../_internal/managed"
import type { Stream } from "./definitions"
import { distributedWith_ } from "./distributedWith"

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
): M.Managed<R, never, A.Chunk<XQ.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  const decider = T.succeed((_: number) => true)
  return distributedWith_(self, n, maximumLag, (_) => decider)
}
