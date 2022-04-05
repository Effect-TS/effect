/**
 * Replicates the given effect `n` times.
 *
 * @tsplus static ets/Effect/Ops replicate
 */
export function replicate<R, E, A>(
  n: number,
  effect: LazyArg<Effect<R, E, A>>
): Chunk<Effect<R, E, A>> {
  return Chunk.range(0, n - 1).map(effect);
}

/**
 * Replicates the given effect `n` times.
 *
 * @tsplus fluent ets/Effect replicate
 */
export function replicateNow_<R, E, A>(
  self: Effect<R, E, A>,
  n: number
): Chunk<Effect<R, E, A>> {
  return replicate(n, self);
}

/**
 * Replicates the given effect `n` times.
 *
 * @tsplus static ets/Effect/Aspects replicateNow
 */
export const replicateNow = Pipeable(replicateNow_);
