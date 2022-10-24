import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import { RingBufferNew } from "@effect/core/support/RingBufferNew"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Drops the last specified number of elements from this stream.
 *
 * Note: this combinator keeps `n` elements in memory. Be careful with big
 * numbers.
 *
 * @tsplus static effect/core/stream/Stream.Aspects dropRight
 * @tsplus pipeable effect/core/stream/Stream dropRight
 * @category mutations
 * @since 1.0.0
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
        Chunk.Chunk<A>,
        unknown,
        E,
        Chunk.Chunk<A>,
        void
      > = Channel.readWith(
        (chunk: Chunk.Chunk<A>) => {
          const outs = pipe(
            chunk,
            Chunk.filterMap((elem) => {
              const head = queue.head()
              queue.put(elem)
              return head
            })
          )
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
