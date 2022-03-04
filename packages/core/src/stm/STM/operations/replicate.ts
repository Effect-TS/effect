import { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { STM } from "../definition"

/**
 * Replicates the given effect `n` times.
 *
 * @tsplus static ets/STMOps replicate
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
 * @ets_data_first replicateNow_
 */
export function replicateNow(n: number) {
  return <R, E, A>(self: STM<R, E, A>): Chunk<STM<R, E, A>> => self.replicate(n)
}
