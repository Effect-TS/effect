import type * as Ex from "../../Exit"
import type * as O from "../../Option"
import type * as Q from "../../Queue"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type { Stream } from "./definitions"
import { distributedWithDynamic_ } from "./distributedWithDynamic"

/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 * The downstream queues will be provided with chunks in the same order they are returned, so
 * the fastest queue might have seen up to (`maximumLag` + 1) chunks more than the slowest queue if it
 * has a lower index than the slowest queue.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueuesDynamic_<R, E, O>(
  self: Stream<R, E, O>,
  maximumLag: number
): M.Managed<R, never, T.UIO<Q.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  const decider = T.succeed((_: symbol) => true)

  return M.map_(
    distributedWithDynamic_(
      self,
      maximumLag,
      (_) => decider,
      (_) => T.unit
    ),
    T.map(([_, q]) => q)
  )
}

/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 * The downstream queues will be provided with chunks in the same order they are returned, so
 * the fastest queue might have seen up to (`maximumLag` + 1) chunks more than the slowest queue if it
 * has a lower index than the slowest queue.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueuesDynamic(maximumLag: number) {
  return <R, E, O>(self: Stream<R, E, O>) => broadcastedQueuesDynamic_(self, maximumLag)
}
