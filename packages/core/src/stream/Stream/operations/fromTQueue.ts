import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Creates a stream from a `TQueue` of values.
 *
 * @tsplus static effect/core/stream/Stream.Ops fromTQueue
 * @category conversions
 * @since 1.0.0
 */
export function fromTQueue<A>(queue: TQueue<A>): Stream<never, never, A> {
  return Stream.repeatEffectChunk(queue.take.map(Chunk.single).commit)
}
