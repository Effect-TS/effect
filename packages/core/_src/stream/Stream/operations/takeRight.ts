import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import { RingBufferNew } from "@effect/core/support/RingBufferNew"

/**
 * Takes the last specified number of elements from this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects takeRight
 * @tsplus pipeable effect/core/stream/Stream takeRight
 */
export function takeRight(n: number) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> => {
    if (n <= 0) {
      return Stream.empty
    }
    concreteStream(self)
    return new StreamInternal(
      Channel.unwrap(
        Effect.sync(new RingBufferNew<A>(n)).map((queue) => {
          const reader: Channel<
            never,
            E,
            Chunk<A>,
            unknown,
            E,
            Chunk<A>,
            void
          > = Channel.readWith(
            (input: Chunk<A>) => {
              input.forEach((a) => queue.put(a))
              return reader
            },
            (err) => Channel.failSync(err),
            () => Channel.write(queue.toChunk()) > Channel.unit
          )
          return self.channel >> reader
        })
      )
    )
  }
}
