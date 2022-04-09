/**
 * Atomically folds using a transactional function.
 *
 * @tsplus fluent ets/TArray reduceSTM
 */
export function reduceSTM_<E, A, Z>(
  self: TArray<A>,
  zero: Z,
  f: (z: Z, a: A) => STM<unknown, E, Z>
): STM<unknown, E, Z> {
  return self.toChunk().flatMap((as) => STM.reduce(as, zero, f));
}

/**
 * Atomically folds using a transactional function.
 *
 * @tsplus static ets/TArray/Aspects reduceSTM
 */
export const reduceSTM = Pipeable(reduceSTM_);
