/**
 * @tsplus static effect/core/stm/TRandom.Ops nextInt
 */
export const nextInt: STM<TRandom, never, number> = STM.serviceWithSTM(TRandom.Tag)((_) =>
  _.nextInt
)
