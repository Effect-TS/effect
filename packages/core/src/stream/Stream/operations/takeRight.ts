import type { Chunk } from "../../../collection/immutable/Chunk"
import { Effect } from "../../../io/Effect"
import { RingBufferNew } from "../../../support/RingBufferNew"
import { Channel } from "../../Channel"
import { Stream } from "../definition"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Takes the last specified number of elements from this stream.
 *
 * @tsplus fluent ets/Stream takeRight
 */
export function takeRight_<R, E, A>(
  self: Stream<R, E, A>,
  n: number,
  __tsplusTrace?: string
): Stream<R, E, A> {
  if (n <= 0) {
    return Stream.empty
  }
  concreteStream(self)
  return new StreamInternal(
    Channel.unwrap(
      Effect.succeed(new RingBufferNew<A>(n)).map((queue) => {
        const reader: Channel<
          unknown,
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
          (err) => Channel.fail(err),
          () => Channel.write(queue.toChunk()) > Channel.unit
        )
        return self.channel >> reader
      })
    )
  )
}

/**
 * Takes the last specified number of elements from this stream.
 */
export const takeRight = Pipeable(takeRight_)
