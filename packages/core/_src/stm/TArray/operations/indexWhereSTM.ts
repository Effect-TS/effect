/**
 * Get the index of the next entry that matches a transactional predicate.
 *
 * @tsplus fluent ets/TArray indexWhereSTM
 */
export function indexWhereSTM_<E, A>(
  self: TArray<A>,
  f: (a: A) => STM<unknown, E, boolean>
): STM<unknown, E, number> {
  return self.indexWhereFromSTM(f, 0);
}

/**
 * Get the index of the next entry that matches a transactional predicate.
 *
 * @tsplus static ets/TArray/Aspects indexWhereSTM
 */
export const indexWhereSTM = Pipeable(indexWhereSTM_);
