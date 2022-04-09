/**
 * Atomically evaluate the conjunction of a transactional predicate across the
 * members of the array.
 *
 * @tsplus fluent ets/TArray forAllSTM
 */
export function forAllSTM_<E, A>(
  self: TArray<A>,
  f: (a: A) => STM<unknown, E, boolean>
): STM<unknown, E, boolean> {
  return self.countSTM(f).map((n) => n === self.length());
}

/**
 * Atomically evaluate the conjunction of a transactional predicate across the
 * members of the array.
 *
 * @tsplus static ets/TArray/Aspects forAllSTM
 */
export const forAllSTM = Pipeable(forAllSTM_);
