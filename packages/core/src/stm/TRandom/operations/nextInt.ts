/**
 * Generates a pseudo-random integer inside a transaction.
 *
 * @tsplus static effect/core/stm/TRandom.Ops nextInt
 * @category getters
 * @since 1.0.0
 */
export const nextInt: STM<TRandom, never, number> = STM.serviceWithSTM(TRandom.Tag)((_) =>
  _.nextInt
)
