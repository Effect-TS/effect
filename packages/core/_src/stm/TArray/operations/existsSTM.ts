/**
 * Determine if the array contains a value satisfying a transactional
 * predicate.
 *
 * @tsplus fluent ets/TArray existsSTM
 */
export function existsSTM_<E, A>(
  self: TArray<A>,
  f: (a: A) => STM<unknown, E, boolean>
): STM<unknown, E, boolean> {
  return self.countSTM(f).map((n) => n > 0)
}

/**
 * Determine if the array contains a value satisfying a transactional
 * predicate.
 *
 * @tsplus static ets/TArray/Aspects existsSTM
 */
export const existsSTM = Pipeable(existsSTM_)
