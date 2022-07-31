/**
 * @tsplus static effect/core/stream/Pull.Ops emit
 */
export function emit<A>(a: A): Effect<never, never, Chunk<A>> {
  return Effect.sync(Chunk.single(a))
}
