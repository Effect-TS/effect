import { STM } from "../definition"

/**
 * Performs this transaction the specified number of times, discarding the
 * results.
 *
 * @tsplus fluent ets/STM replicateSTMDiscard
 */
export function replicateSTMDiscard_<R, E, A>(
  self: STM<R, E, A>,
  n: number
): STM<R, E, void> {
  return STM.collectAllDiscard(self.replicate(n))
}

/**
 * Performs this transaction the specified number of times, discarding the
 * results.
 *
 * @ets_data_first replicateSTMDiscard_
 */
export function replicateSTMDiscard(n: number) {
  return <R, E, A>(self: STM<R, E, A>) => self.replicateSTMDiscard(n)
}
