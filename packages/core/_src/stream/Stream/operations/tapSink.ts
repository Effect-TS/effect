import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import { TerminationStrategy } from "@effect/core/stream/Stream/TerminationStrategy"

/**
 * Sends all elements emitted by this stream to the specified sink in addition
 * to emitting them.
 *
 * @tsplus fluent ets/Stream tapSink
 */
export function tapSink_<R, E, A, R2, E2, X, Z>(
  self: Stream<R, E, A>,
  sink: LazyArg<Sink<R2, E2, A, X, Z>>,
  __tsplusTrace?: string
): Stream<R | R2, E | E2, A> {
  return Stream.fromEffect(Queue.bounded<Take<E | E2, A>>(1)).flatMap((queue) => {
    const right = Stream.fromQueueWithShutdown(queue, 1).flattenTake()

    const loop: Channel<
      R | R2,
      E,
      Chunk<A>,
      unknown,
      E2,
      Chunk<A>,
      unknown
    > = Channel.readWithCause(
      (chunk: Chunk<A>) =>
        Channel.fromEffect(queue.offer(Take.chunk(chunk))) >
          Channel.write(chunk) >
          loop,
      (cause) => Channel.fromEffect(queue.offer(Take.failCause(cause))),
      () => Channel.fromEffect(queue.shutdown)
    )

    concreteStream(self)

    return (new StreamInternal(self.channel >> loop) as Stream<R | R2, E2, A>).merge(
      Stream.execute(right.run(sink)),
      () => TerminationStrategy.Both
    )
  })
}

/**
 * Sends all elements emitted by this stream to the specified sink in addition
 * to emitting them.
 *
 * @tsplus static ets/Stream/Aspects tapSink
 */
export const tapSink = Pipeable(tapSink_)
