/**
 * Finds the key/value pair matching the specified predicate, and uses the
 * provided function to extract a value out of it.
 *
 * @tsplus static effect/core/stm/TMap.Aspects find
 * @tsplus pipeable effect/core/stm/TMap find
 */
export function find<K, V, A>(pf: (kv: Tuple<[K, V]>) => Maybe<A>) {
  return (self: TMap<K, V>): STM<never, never, Maybe<A>> =>
    self.findSTM((kv) => pf(kv).fold(STM.fail(Maybe.none), STM.succeed))
}
