import * as Chunk from "@fp-ts/data/Chunk"

/**
 * @tsplus static effect/core/stream/Pull.Ops emit
 * @category constructors
 * @since 1.0.0
 */
export function emit<A>(a: A): Effect<never, never, Chunk.Chunk<A>> {
  return Effect.sync(Chunk.single(a))
}
