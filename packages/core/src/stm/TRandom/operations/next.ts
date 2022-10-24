/**
 * @tsplus static effect/core/stm/TRandom.Ops next
 * @category getters
 * @since 1.0.0
 */
export const next: STM<TRandom, never, number> = STM.serviceWithSTM(TRandom.Tag)((_) => _.next)
