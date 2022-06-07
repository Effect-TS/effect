/**
 * Finds the key/value pair matching the specified predicate, and uses the
 * provided effectful function to extract a value out of it.
 *
 * @tsplus fluent ets/TMap findSTM
 */
export function findSTM_<K, V, R, E, A>(
  self: TMap<K, V>,
  f: (kv: Tuple<[K, V]>) => STM<R, Option<E>, A>
): STM<R, E, Option<A>> {
  return self.foldSTM(Option.emptyOf<A>(), (a, kv) => {
    if (a.isNone()) {
      return f(kv).foldSTM((_) => _.fold(STM.none, (e) => STM.fail(e)), STM.some)
    }

    return STM.succeedNow(a)
  })
}

/**
 * Finds the key/value pair matching the specified predicate, and uses the
 * provided effectful function to extract a value out of it.
 *
 * @tsplus static ets/TMap/Aspects findSTM
 */
export const findSTM = Pipeable(findSTM_)
