import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Stream } from "../definition"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

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
 * @tsplus static ets/StreamOps mapChunks
 */
export const mapChunks = Pipeable(mapChunks_)
