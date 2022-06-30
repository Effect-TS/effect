import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Transforms the chunks emitted by this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mapChunks
 * @tsplus pipeable effect/core/stream/Stream mapChunks
 */
export function mapChunks<A, A2>(
  f: (chunk: Chunk<A>) => Chunk<A2>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A2> => {
    concreteStream(self)
    return new StreamInternal(self.channel.mapOut(f))
  }
}
