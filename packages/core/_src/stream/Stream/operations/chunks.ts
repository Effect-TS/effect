import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Exposes the underlying chunks of the stream as a stream of chunks of
 * elements.
 *
 * @tsplus fluent ets/Stream chunks
 */
export function chunks<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Stream<R, E, Chunk<A>> {
  concreteStream(self)
  return new StreamInternal(self.channel.mapOut(Chunk.single))
}
