/**
 * @tsplus static ets/Channel/Ops fromQueue
 */
export function fromQueue<Err, Elem, Done>(
  queue: LazyArg<Dequeue<Either<Exit<Err, Done>, Elem>>>
): Channel<unknown, unknown, unknown, unknown, Err, Elem, Done> {
  return Channel.suspend(fromQueueInternal(queue()))
}

function fromQueueInternal<Err, Elem, Done>(
  queue: Dequeue<Either<Exit<Err, Done>, Elem>>
): Channel<unknown, unknown, unknown, unknown, Err, Elem, Done> {
  return Channel.fromEffect(queue.take).flatMap((either) =>
    either.fold(
      (exit) =>
        exit.fold(
          (cause) => Channel.failCause(cause),
          (done): Channel<unknown, unknown, unknown, unknown, Err, Elem, Done> => Channel.succeedNow(done)
        ),
      (elem) => Channel.write(elem) > fromQueueInternal<Err, Elem, Done>(queue)
    )
  )
}
