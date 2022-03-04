import { STM } from "../definition"

/**
 * Accesses the environment of the transaction to perform a transaction.
 *
 * @tsplus static ets/STMOps environmentWithSTM
 */
export function environmentWithSTM<R0, R, E, A>(
  f: (r: R0) => STM<R, E, A>
): STM<R & R0, E, A> {
  return STM.environment<R0>().flatMap(f)
}
