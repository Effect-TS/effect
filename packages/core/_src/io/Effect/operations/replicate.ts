/**
 * Replicates the given effect `n` times.
 *
 * @tsplus static effect/core/io/Effect.Ops replicate
 */
export function replicate<R, E, A>(
  n: number,
  effect: LazyArg<Effect<R, E, A>>
): Chunk<Effect<R, E, A>> {
  return Chunk.range(0, n - 1).map(effect)
}

/**
 * Replicates the given effect `n` times.
 *
 * @tsplus static effect/core/io/Effect.Aspects replicate
 * @tsplus pipeable effect/core/io/Effect replicate
 */
export function replicateNow(n: number) {
  return <R, E, A>(self: Effect<R, E, A>): Chunk<Effect<R, E, A>> => Effect.replicate(n, self)
}
