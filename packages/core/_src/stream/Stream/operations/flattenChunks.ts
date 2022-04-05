import { concreteStream, StreamInternal } from "@effect-ts/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Submerges the chunks carried by this stream into the stream's structure,
 * while still preserving them.
 *
 * @tsplus fluent ets/Stream flattenChunks
 */
export function flattenChunks<R, E, A>(
  self: Stream<R, E, Chunk<A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  concreteStream(self);
  return new StreamInternal(self.channel.mapOut((chunk) => chunk.flatten()));
}
