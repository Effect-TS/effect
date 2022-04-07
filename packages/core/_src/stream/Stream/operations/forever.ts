import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Repeats this stream forever.
 *
 * @tsplus fluent ets/Stream forever
 */
export function forever<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  concreteStream(self);
  return new StreamInternal(self.channel.repeated());
}
