import type { Chunk } from "../../../collection/immutable/Chunk"
import { STM } from "../definition"

/**
 * Performs this transaction the specified number of times and collects the
 * results.
 *
 * @tsplus fluent ets/STM replicateSTM
 */
export function replicateSTM_<R, E, A>(
  self: STM<R, E, A>,
  n: number
): STM<R, E, Chunk<A>> {
  return STM.suspend(STM.collectAll(self.replicate(n)))
}

/**
 * Performs this transaction the specified number of times and collects the
 * results.
 *
 * @ets_data_first replicateSTM_
 */
export function replicateSTM(n: number) {
  return <R, E, A>(self: STM<R, E, A>): STM<R, E, Chunk<A>> => self.replicateSTM(n)
}
