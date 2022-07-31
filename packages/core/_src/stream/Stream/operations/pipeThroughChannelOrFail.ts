import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Pipes all values from this stream through the provided channel, passing
 * through any error emitted by this stream unchanged.
 *
 * @tsplus static effect/core/stream/Stream.Aspects pipeThroughChannelFail
 * @tsplus pipeable effect/core/stream/Stream pipeThroughChannelFail
 */
export function pipeThroughChannelFail<E, A, R2, E2, A2>(
  channel: LazyArg<Channel<R2, E, Chunk<A>, unknown, E2, Chunk<A2>, unknown>>
) {
  return <R>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A2> => {
    concreteStream(self)
    return new StreamInternal(self.channel.pipeToOrFail(channel))
  }
}
