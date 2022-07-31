import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Takes a stream that emits chunks of values and submerges the chunks into the
 * structure of the stream, effectively "flattening" the chunks into the stream.
 *
 * @tsplus getter effect/core/stream/Stream unchunks
 */
export function unchunks<R, E, A>(
  self: Stream<R, E, Chunk<A>>
): Stream<R, E, A> {
  concreteStream(self)
  return new StreamInternal(self.channel.mapOut((chunk) => chunk.flatten))
}
