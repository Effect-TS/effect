import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Transforms the chunks emitted by this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mapChunks
 * @tsplus pipeable effect/core/stream/Stream mapChunks
 * @category mapping
 * @since 1.0.0
 */
export function mapChunks<A, A2>(
  f: (chunk: Chunk<A>) => Chunk<A2>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A2> => {
    concreteStream(self)
    return new StreamInternal(self.channel.mapOut(f))
  }
}
