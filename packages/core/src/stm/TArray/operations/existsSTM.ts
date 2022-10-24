/**
 * Determine if the array contains a value satisfying a transactional
 * predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects existsSTM
 * @tsplus pipeable effect/core/stm/TArray existsSTM
 * @category elements
 * @since 1.0.0
 */
export function existsSTM<E, A>(f: (a: A) => STM<never, E, boolean>) {
  return (self: TArray<A>): STM<never, E, boolean> => self.countSTM(f).map((n) => n > 0)
}
