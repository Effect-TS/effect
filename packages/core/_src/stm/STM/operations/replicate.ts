/**
 * Replicates the given effect `n` times.
 *
 * @tsplus static effect/core/stm/STM.Ops replicate
 */
export function replicate<R, E, A>(n: number, stm: STM<R, E, A>): Chunk<STM<R, E, A>> {
  return Chunk.range(0, n - 1).map(() => stm)
}

/**
 * Replicates the given effect `n` times.
 *
 * @tsplus static effect/core/stm/STM.Aspects replicate
 * @tsplus pipeable effect/core/stm/STM replicate
 */
export function replicateNow(n: number) {
  return <R, E, A>(self: STM<R, E, A>): Chunk<STM<R, E, A>> => replicate(n, self)
}
