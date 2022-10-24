import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import { RingBufferNew } from "@effect/core/support/RingBufferNew"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Takes the last specified number of elements from this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects takeRight
 * @tsplus pipeable effect/core/stream/Stream takeRight
 * @category mutations
 * @since 1.0.0
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
            Chunk.Chunk<A>,
            unknown,
            E,
            Chunk.Chunk<A>,
            void
          > = Channel.readWith(
            (input: Chunk.Chunk<A>) => {
              pipe(input, Chunk.forEach((a) => queue.put(a)))
              return reader
            },
            (err) => Channel.fail(err),
            () => Channel.write(queue.toChunk()).flatMap(() => Channel.unit)
          )
          return self.channel.pipeTo(reader)
        })
      )
    )
  }
}
