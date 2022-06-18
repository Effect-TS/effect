/**
 * Finds all the key/value pairs matching the specified predicate, and uses
 * the provided effectful function to extract values out of them..
 *
 * @tsplus fluent ets/TMap findAllSTM
 */
export function findAllSTM_<K, V, R, E, A>(
  self: TMap<K, V>,
  pf: (kv: Tuple<[K, V]>) => STM<R, Maybe<E>, A>
): STM<R, E, Chunk<A>> {
  return self.foldSTM(
    Chunk.empty<A>(),
    (acc, kv) =>
      pf(kv).foldSTM((_) => _.fold(STM.succeedNow(acc), (e) => STM.fail(e)), (a) => STM.succeedNow(acc.append(a)))
  )
}

/**
 * Finds all the key/value pairs matching the specified predicate, and uses
 * the provided effectful function to extract values out of them..
 *
 * @tsplus static ets/TMap/Aspects findAllSTM
 */
export const findAllSTM = Pipeable(findAllSTM_)
