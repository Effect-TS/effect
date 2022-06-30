/**
 * @tsplus static effect/core/stm/TRandom.Ops next
 */
export const next: STM<TRandom, never, number> = STM.serviceWithSTM(TRandom.Tag)((_) => _.next)
