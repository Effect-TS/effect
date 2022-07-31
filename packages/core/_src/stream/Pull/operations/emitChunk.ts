/**
 * @tsplus static effect/core/stream/Pull.Ops emitChunk
 */
export function emitChunk<A>(as: Chunk<A>): Effect<never, never, Chunk<A>> {
  return Effect.sync(as)
}
