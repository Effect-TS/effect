/**
 * Accesses the environment of the transaction to perform a transaction.
 *
 * @tsplus static effect/core/stm/STM.Ops environmentWithSTM
 */
export function environmentWithSTM<R0, R, E, A>(
  f: (env: Env<R0>) => STM<R, E, A>
): STM<R | R0, E, A> {
  return STM.environment<R0>().flatMap(f)
}
