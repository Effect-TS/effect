import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import { RingBufferNew } from "@effect/core/support/RingBufferNew"

/**
 * Drops the last specified number of elements from this stream.
 *
 * Note: this combinator keeps `n` elements in memory. Be careful with big
 * numbers.
 *
 * @tsplus static effect/core/stream/Stream.Aspects dropRight
 * @tsplus pipeable effect/core/stream/Stream dropRight
 */
export function dropRight(n: number) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> => {
    if (n <= 0) {
      return self
    }
    return Stream.sync(new RingBufferNew<A>(n)).flatMap((queue) => {
      const reader: Channel<
        never,
        E,
        Chunk<A>,
        unknown,
        E,
        Chunk<A>,
        void
      > = Channel.readWith(
        (chunk: Chunk<A>) => {
          const outs = chunk.collect((elem) => {
            const head = queue.head()
            queue.put(elem)
            return head
          })
          return Channel.write(outs).flatMap(() => reader)
        },
        (err) => Channel.fail(err),
        () => Channel.unit
      )
      concreteStream(self)
      return new StreamInternal(self.channel >> reader)
    })
  }
}
