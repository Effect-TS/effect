import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * @tsplus static effect/core/stream/Pull.Ops emitChunk
 * @category constructors
 * @since 1.0.0
 */
export function emitChunk<A>(as: Chunk<A>): Effect<never, never, Chunk<A>> {
  return Effect.succeed(as)
}
