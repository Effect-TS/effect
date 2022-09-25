/**
 * @tsplus static effect/core/stream/Channel.Ops fromQueue
 */
export function fromQueue<Err, Elem, Done>(
  queue: Dequeue<Either<Exit<Err, Done>, Elem>>
): Channel<never, unknown, unknown, unknown, Err, Elem, Done> {
  return Channel.suspend(fromQueueInternal(queue))
}

function fromQueueInternal<Err, Elem, Done>(
  queue: Dequeue<Either<Exit<Err, Done>, Elem>>
): Channel<never, unknown, unknown, unknown, Err, Elem, Done> {
  return Channel.fromEffect(queue.take).flatMap((either) =>
    either.fold(
      (exit) =>
        exit.fold(
          (cause) => Channel.failCause(cause),
          (done): Channel<never, unknown, unknown, unknown, Err, Elem, Done> =>
            Channel.succeed(done)
        ),
      (elem) => Channel.write(elem)
        .flatMap(() => fromQueueInternal<Err, Elem, Done>(queue))
    )
  )
}
