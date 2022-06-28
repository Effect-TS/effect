import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Effectfully transforms the chunks emitted by this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mapChunksEffect
 * @tsplus pipeable effect/core/stream/Stream mapChunksEffect
 */
export function mapChunksEffect<A, R2, E2, A2>(
  f: (chunk: Chunk<A>) => Effect<R2, E2, Chunk<A2>>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A2> => {
    concreteStream(self)
    return new StreamInternal(self.channel.mapOutEffect(f))
  }
}
