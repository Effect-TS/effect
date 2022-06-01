/**
 * Count the values in the array matching a transactional predicate.
 *
 * @tsplus fluent ets/TArray countSTM
 */
export function countSTM_<E, A>(
  self: TArray<A>,
  f: (a: A) => STM<never, E, boolean>
): STM<never, E, number> {
  return self.reduceSTM(0, (n, a) => f(a).map((result) => (result ? n + 1 : n)))
}

/**
 * Count the values in the array matching a transactional predicate.
 *
 * @tsplus static ets/TArray/Aspects countSTM
 */
export const countSTM = Pipeable(countSTM_)
