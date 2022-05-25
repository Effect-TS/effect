/**
 * Replicates the given effect `n` times.
 *
 * @tsplus static ets/STM/Ops replicate
 */
export function replicate<R, E, A>(
  n: number,
  stm: LazyArg<STM<R, E, A>>
): Chunk<STM<R, E, A>> {
  return Chunk.range(0, n - 1).map(stm)
}

/**
 * Replicates the given effect `n` times.
 *
 * @tsplus fluent ets/STM replicate
 */
export function replicateNow_<R, E, A>(
  self: STM<R, E, A>,
  n: number
): Chunk<STM<R, E, A>> {
  return replicate(n, self)
}

/**
 * Replicates the given effect `n` times.
 *
 * @tsplus static ets/STM/Aspects replicate
 */
export const replicateNow = Pipeable(replicateNow_)
