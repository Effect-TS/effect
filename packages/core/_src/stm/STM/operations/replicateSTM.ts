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
  return STM.suspend(STM.collectAll(self.replicate(n)));
}

/**
 * Performs this transaction the specified number of times and collects the
 * results.
 *
 * @tsplus static ets/STM/Aspects replicateSTM
 */
export const replicateSTM = Pipeable(replicateSTM_);
