import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Transforms the chunks emitted by this stream.
 *
 * @tsplus fluent ets/Stream mapChunks
 */
export function mapChunks_<R, E, A, A2>(
  self: Stream<R, E, A>,
  f: (chunk: Chunk<A>) => Chunk<A2>,
  __tsplusTrace?: string
): Stream<R, E, A2> {
  concreteStream(self)
  return new StreamInternal(self.channel.mapOut(f))
}

/**
 * Transforms the chunks emitted by this stream.
 *
 * @tsplus static ets/Stream/Aspects mapChunks
 */
export const mapChunks = Pipeable(mapChunks_)
