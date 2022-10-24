import type { Context } from "@fp-ts/data/Context"

/**
 * Accesses the environment of the transaction to perform a transaction.
 *
 * @tsplus static effect/core/stm/STM.Ops environmentWithSTM
 * @category environment
 * @since 1.0.0
 */
export function environmentWithSTM<R0, R, E, A>(
  f: (context: Context<R0>) => STM<R, E, A>
): STM<R | R0, E, A> {
  return STM.environment<R0>().flatMap(f)
}
