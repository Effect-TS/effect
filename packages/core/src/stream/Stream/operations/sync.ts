import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Creates a single-valued pure stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops sync
 * @category constructors
 * @since 1.0.0
 */
export function sync<A>(a: LazyArg<A>): Stream<never, never, A> {
  return Stream.suspend(Stream.fromChunk(Chunk.single(a())))
}
