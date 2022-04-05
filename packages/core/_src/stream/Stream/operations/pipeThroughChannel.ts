import { concreteStream, StreamInternal } from "@effect-ts/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Pipes all the values from this stream through the provided channel.
 *
 * @tsplus fluent ets/Stream pipeThroughChannel
 */
export function pipeThroughChannel_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  channel: LazyArg<Channel<R2, E, Chunk<A>, unknown, E2, Chunk<A2>, unknown>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A2> {
  concreteStream(self);
  return new StreamInternal(self.channel >> channel);
}

/**
 * Pipes all the values from this stream through the provided channel.
 *
 * @tsplus static ets/Stream/Aspects pipeThroughChannel
 */
export const pipeThroughChannel = Pipeable(pipeThroughChannel_);
