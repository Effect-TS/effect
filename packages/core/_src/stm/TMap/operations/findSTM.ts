/**
 * Finds the key/value pair matching the specified predicate, and uses the
 * provided effectful function to extract a value out of it.
 *
 * @tsplus static effect/core/stm/TMap.Aspects findSTM
 * @tsplus pipeable effect/core/stm/TMap findSTM
 */
export function findSTM<K, V, R, E, A>(
  f: (kv: Tuple<[K, V]>) => STM<R, Maybe<E>, A>
) {
  return (self: TMap<K, V>): STM<R, E, Maybe<A>> =>
    self.foldSTM(Maybe.empty<A>(), (a, kv) => {
      if (a.isNone()) {
        return f(kv).foldSTM((_) => _.fold(STM.none, (e) => STM.fail(e)), STM.some)
      }

      return STM.succeedNow(a)
    })
}
