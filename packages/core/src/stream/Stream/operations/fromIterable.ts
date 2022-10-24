import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Creates a stream from an iterable collection of values.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromIterable
 */
export function fromCollection<A>(as: Iterable<A>): Stream<never, never, A> {
  return Stream.fromChunk(Chunk.fromIterable(as))
}
