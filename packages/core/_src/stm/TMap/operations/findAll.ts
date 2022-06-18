/**
 * Finds all the key/value pairs matching the specified predicate, and uses
 * the provided function to extract values out them.
 *
 * @tsplus fluent ets/TMap findAll
 */
export function findAll_<K, V, A>(self: TMap<K, V>, pf: (kv: Tuple<[K, V]>) => Maybe<A>): USTM<Chunk<A>> {
  return self.findAllSTM((kv) => pf(kv).fold(STM.fail(Maybe.none), STM.succeedNow))
}

/**
 * Finds all the key/value pairs matching the specified predicate, and uses
 * the provided function to extract values out them.
 *
 * @tsplus static ets/TMap/Aspects findAll
 */
export const findAll = Pipeable(findAll_)
