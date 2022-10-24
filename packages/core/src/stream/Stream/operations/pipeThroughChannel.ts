import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Pipes all the values from this stream through the provided channel.
 *
 * @tsplus static effect/core/stream/Stream.Aspects pipeThroughChannel
 * @tsplus pipeable effect/core/stream/Stream pipeThroughChannel
 * @category mutations
 * @since 1.0.0
 */
export function pipeThroughChannel<E, A, R2, E2, A2>(
  channel: Channel<R2, E, Chunk<A>, unknown, E2, Chunk<A2>, unknown>
) {
  return <R>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A2> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> channel)
  }
}
