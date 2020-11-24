import * as T from "../../Effect"
import type { Exit } from "../../Exit"
import * as M from "../../Managed"
import type { Option } from "../../Option"
import type { Dequeue } from "../../Queue"
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
): M.Managed<R, never, T.UIO<Dequeue<Exit<Option<E>, O>>>> {
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
