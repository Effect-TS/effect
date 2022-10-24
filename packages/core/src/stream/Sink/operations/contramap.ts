import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Transforms this sink's input elements.
 *
 * @tsplus static effect/core/stream/Sink.Aspects contramap
 * @tsplus pipeable effect/core/stream/Sink contramap
 * @category mapping
 * @since 1.0.0
 */
export function contramap<In, In1>(f: (input: In1) => In) {
  return <R, E, L, Z>(self: Sink<R, E, In, L, Z>): Sink<R, E, In1, L, Z> =>
    self.contramapChunks(Chunk.map(f))
}
