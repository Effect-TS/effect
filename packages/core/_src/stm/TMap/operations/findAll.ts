/**
 * Finds all the key/value pairs matching the specified predicate, and uses
 * the provided function to extract values out them.
 *
 * @tsplus static effect/core/stm/TMap.Aspects findAll
 * @tsplus pipeable effect/core/stm/TMap findAll
 */
export function findAll<K, V, A>(pf: (kv: Tuple<[K, V]>) => Maybe<A>) {
  return (self: TMap<K, V>): STM<never, never, Chunk<A>> =>
    self.findAllSTM((kv) => pf(kv).fold(STM.fail(Maybe.none), STM.succeed))
}
