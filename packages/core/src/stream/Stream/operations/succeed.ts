import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Creates a single-valued pure stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops succeed
 * @category constructors
 * @since 1.0.0
 */
export function succeed<A>(a: A): Stream<never, never, A> {
  return Stream.fromChunk(Chunk.single(a))
}
