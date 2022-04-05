import { concreteStream, StreamInternal } from "@effect-ts/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Transforms the elements of this stream using the supplied function.
 *
 * @tsplus fluent ets/Stream map
 */
export function map_<R, E, A, B>(
  self: Stream<R, E, A>,
  f: (a: A) => B,
  __tsplusTrace?: string
): Stream<R, E, B> {
  concreteStream(self);
  return new StreamInternal(self.channel.mapOut((chunk) => chunk.map(f)));
}

/**
 * Transforms the elements of this stream using the supplied function.
 *
 * @tsplus static ets/Stream/Aspects map
 */
export const map = Pipeable(map_);
