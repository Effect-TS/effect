import type { Either } from "@fp-ts/data/Either"

/**
 * @tsplus static effect/core/stream/Channel.Ops fromQueue
 * @category conversions
 * @since 1.0.0
 */
export function fromQueue<Err, Elem, Done>(
  queue: Dequeue<Either<Exit<Err, Done>, Elem>>
): Channel<never, unknown, unknown, unknown, Err, Elem, Done> {
  return Channel.suspend(fromQueueInternal(queue))
}

function fromQueueInternal<Err, Elem, Done>(
  queue: Dequeue<Either<Exit<Err, Done>, Elem>>
): Channel<never, unknown, unknown, unknown, Err, Elem, Done> {
  return Channel.fromEffect(queue.take).flatMap((either) => {
    switch (either._tag) {
      case "Left": {
        const exit = either.left
        switch (exit._tag) {
          case "Failure": {
            return Channel.failCause(exit.cause)
          }
          case "Success": {
            return Channel.succeed(exit.value)
          }
        }
      }
      case "Right": {
        return Channel.write(either.right).flatMap(() => fromQueueInternal(queue))
      }
    }
  })
}
