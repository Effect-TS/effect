/**
 * merges the key/value pair matching the specified predicate, and uses the
 * provided function to extract a value out of it.
 *
 * @tsplus fluent ets/TMap merge
 */
export function merge_<K, V>(self: TMap<K, V>, k: K, v: V, f: (values: Tuple<[V, V]>) => V): USTM<V> {
  return self.get(k).flatMap((_) =>
    _.fold(self.put(k, v).as(v), (v0) => {
      const v1 = f(Tuple(v0, v))

      return self.put(k, v1).as(v1)
    })
  )
}

/**
 * merges the key/value pair matching the specified predicate, and uses the
 * provided function to extract a value out of it.
 *
 * @tsplus static ets/TMap/Aspects merge
 */
export const merge = Pipeable(merge_)
