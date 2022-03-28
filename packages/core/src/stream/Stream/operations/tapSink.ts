import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Queue } from "../../../io/Queue"
import { Channel } from "../../Channel"
import type { Sink } from "../../Sink"
import { Take } from "../../Take"
import { Stream } from "../definition"
import { TerminationStrategy } from "../TerminationStrategy"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

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
): Stream<R & R2, E | E2, A> {
  return Stream.fromEffect(Queue.bounded<Take<E | E2, A>>(1)).flatMap((queue) => {
    const right = Stream.fromQueueWithShutdown(queue, 1).flattenTake()

    const loop: Channel<
      R & R2,
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
      () => Channel.fromEffect(queue.shutdown())
    )

    concreteStream(self)

    return (new StreamInternal(self.channel >> loop) as Stream<R & R2, E2, A>).merge(
      Stream.execute(right.run(sink())),
      () => TerminationStrategy.Both
    )
  })
}

/**
 * Sends all elements emitted by this stream to the specified sink in addition
 * to emitting them.
 */
export const tapSink = Pipeable(tapSink_)
