/**
 * Replicates the given effect `n` times.
 *
 * @tsplus static effect/core/io/Effect.Aspects replicate
 * @tsplus pipeable effect/core/io/Effect replicate
 */
export function replicate(n: number) {
  return <R, E, A>(self: Effect<R, E, A>): Chunk<Effect<R, E, A>> =>
    Chunk.range(0, n - 1).map(() => self)
}
