/**
 * @tsplus static ets/Channel/Ops toQueue
 */
export function toQueue<Err, Done, Elem>(
  queue: LazyArg<Enqueue<Either<Exit<Err, Done>, Elem>>>
): Channel<unknown, Err, Elem, Done, never, never, unknown> {
  return Channel.suspend(toQueueInternal(queue()))
}

function toQueueInternal<Err, Done, Elem>(
  queue: Enqueue<Either<Exit<Err, Done>, Elem>>
): Channel<unknown, Err, Elem, Done, never, never, unknown> {
  return Channel.readWithCause(
    (elem) => Channel.fromEffect(queue.offer(Either.right(elem))) > toQueueInternal(queue),
    (cause) => Channel.fromEffect(queue.offer(Either.left(Exit.failCause(cause)))),
    (done) => Channel.fromEffect(queue.offer(Either.left(Exit.succeed(done))))
  )
}
