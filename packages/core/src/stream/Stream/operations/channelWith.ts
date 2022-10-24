import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Performs the specified operation with the channel underlying this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects channelWith
 * @tsplus pipeable effect/core/stream/Stream channelWith
 * @category mutations
 * @since 1.0.0
 */
export function channelWith<R, E, A, R1, E1, A1>(
  f: (
    channel: Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown>
  ) => Channel<R1, unknown, unknown, unknown, E1, Chunk<A1>, unknown>
) {
  return (self: Stream<R, E, A>): Stream<R | R1, E | E1, A1> => {
    concreteStream(self)
    return new StreamInternal(f(self.channel))
  }
}
