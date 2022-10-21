/**
 * Generates a pseudo-random integer in the specified range inside a
 * transaction.
 *
 * @tsplus static effect/core/stm/TRandom.Ops nextIntBetween
 */
export function nextIntBetween(low: number, high: number): STM<TRandom, never, number> {
  return STM.serviceWithSTM(TRandom.Tag)((_) => _.nextIntBetween(low, high))
}
