import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Submerges the chunks carried by this stream into the stream's structure,
 * while still preserving them.
 *
 * @tsplus static effect/core/stream/Stream.Ops flattenChunks
 * @tsplus getter effect/core/stream/Stream flattenChunks
 */
export function flattenChunks<R, E, A>(self: Stream<R, E, Chunk<A>>): Stream<R, E, A> {
  concreteStream(self)
  return new StreamInternal(self.channel.mapOut((chunk) => chunk.flatten))
}
