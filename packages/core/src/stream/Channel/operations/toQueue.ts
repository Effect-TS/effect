import { Either } from "../../../data/Either"
import { Exit } from "../../../io/Exit"
import type { Enqueue } from "../../../io/Queue"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps toQueue
 */
export function toQueue<Err, Done, Elem>(
  queue: Enqueue<Either<Exit<Err, Done>, Elem>>
): Channel<unknown, Err, Elem, Done, never, never, unknown> {
  return Channel.suspend(toQueueInternal(queue))
}

function toQueueInternal<Err, Done, Elem>(
  queue: Enqueue<Either<Exit<Err, Done>, Elem>>
): Channel<unknown, Err, Elem, Done, never, never, unknown> {
  return Channel.readWithCause(
    (elem) =>
      Channel.fromEffect(queue.offer(Either.right(elem))) > toQueueInternal(queue),
    (cause) => Channel.fromEffect(queue.offer(Either.left(Exit.failCause(cause)))),
    (done) => Channel.fromEffect(queue.offer(Either.left(Exit.succeed(done))))
  )
}
