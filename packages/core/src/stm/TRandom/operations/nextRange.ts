/**
 * @tsplus static effect/core/stm/TRandom.Ops nextRange
 * @category getters
 * @since 1.0.0
 */
export function nextRange(low: number, high: number): STM<TRandom, never, number> {
  return STM.serviceWithSTM(TRandom.Tag)((_) => _.nextRange(low, high))
}
