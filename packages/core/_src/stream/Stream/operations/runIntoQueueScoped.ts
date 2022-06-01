import { concreteStream } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Like `Stream.runIntoQueue`, but provides the result as a scoped effect to
 * allow for scope composition.
 *
 * @tsplus fluent ets/Stream runIntoQueueScoped
 */
export function runIntoQueueScoped_<R, E extends E1, A, E1>(
  self: Stream<R, E, A>,
  queue: LazyArg<Enqueue<Take<E1, A>>>,
  __tsplusTrace?: string
): Effect<R | Scope, E | E1, void> {
  const writer: Channel<
    R,
    E,
    Chunk<A>,
    unknown,
    E,
    Take<E | E1, A>,
    unknown
  > = Channel.readWithCause(
    (input: Chunk<A>) => Channel.write(Take.chunk(input)) > writer,
    (cause) => Channel.write(Take.failCause(cause)),
    () => Channel.write(Take.end)
  )
  concreteStream(self)
  return Effect.succeed(queue).flatMap((queue) =>
    (self.channel >> writer)
      .mapOutEffect((take) => queue.offer(take))
      .drain()
      .runScoped()
      .asUnit()
  )
}

/**
 * Like `Stream.runIntoQueue`, but provides the result as a scoped effect to
 * allow for scope composition.
 *
 * @tsplus static ets/Stream/Aspects runIntoQueueScoped
 */
export const runIntoQueueScoped = Pipeable(runIntoQueueScoped_)
