import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Performs the specified operation with the channel underlying this stream.
 *
 * @tsplus fluent ets/Stream channelWith
 */
export function channelWith_<R, E, A, R1, E1, A1>(
  self: Stream<R, E, A>,
  f: (
    channel: Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown>
  ) => Channel<R1, unknown, unknown, unknown, E1, Chunk<A1>, unknown>,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, A1> {
  concreteStream(self);
  return new StreamInternal(f(self.channel));
}

/**
 * Performs the specified operation with the channel underlying this stream.
 *
 * @tsplus static ets/Stream/Aspects channelWith
 */
export const channelWith = Pipeable(channelWith_);
