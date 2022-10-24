import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Creates a stream from a `Chunk` of values.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromChunk
 * @category conversions
 * @since 1.0.0
 */
export function fromChunk<A>(chunk: Chunk<A>): Stream<never, never, A> {
  return new StreamInternal(chunk.length === 0 ? Channel.unit : Channel.write(chunk))
}
