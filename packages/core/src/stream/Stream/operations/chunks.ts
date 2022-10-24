import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Exposes the underlying chunks of the stream as a stream of chunks of
 * elements.
 *
 * @tsplus getter effect/core/stream/Stream chunks
 * @category mutations
 * @since 1.0.0
 */
export function chunks<R, E, A>(
  self: Stream<R, E, A>
): Stream<R, E, Chunk.Chunk<A>> {
  concreteStream(self)
  return new StreamInternal(self.channel.mapOut(Chunk.single))
}
