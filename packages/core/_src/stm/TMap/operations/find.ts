/**
 * Finds the key/value pair matching the specified predicate, and uses the
 * provided function to extract a value out of it.
 *
 * @tsplus fluent ets/TMap find
 */
export function find_<K, V, A>(self: TMap<K, V>, pf: (kv: Tuple<[K, V]>) => Maybe<A>): USTM<Maybe<A>> {
  return self.findSTM((kv) => pf(kv).fold(STM.fail(Maybe.none), STM.succeedNow))
}

/**
 * Finds the key/value pair matching the specified predicate, and uses the
 * provided function to extract a value out of it.
 *
 * @tsplus static ets/TMap/Aspects find
 */
export const find = Pipeable(find_)
