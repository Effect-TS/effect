/**
 * Generates a pseudo-random boolean inside a transaction.
 *
 * @tsplus static effect/core/stm/TRandom.Ops nextBoolean
 * @category getters
 * @since 1.0.0
 */
export const nextBoolean: STM<TRandom, never, boolean> = STM.serviceWithSTM(TRandom.Tag)((_) =>
  _.nextBoolean
)
