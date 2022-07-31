/**
 * Finds all the key/value pairs matching the specified predicate, and uses
 * the provided effectful function to extract values out of them..
 *
 * @tsplus static effect/core/stm/TMap.Aspects findAllSTM
 * @tsplus pipeable effect/core/stm/TMap findAllSTM
 */
export function findAllSTM<K, V, R, E, A>(
  pf: (kv: Tuple<[K, V]>) => STM<R, Maybe<E>, A>
) {
  return (self: TMap<K, V>): STM<R, E, Chunk<A>> =>
    self.foldSTM(
      Chunk.empty<A>(),
      (acc, kv) =>
        pf(kv).foldSTM((_) => _.fold(STM.succeedNow(acc), (e) => STM.fail(e)), (a) =>
          STM.succeedNow(acc.append(a)))
    )
}
