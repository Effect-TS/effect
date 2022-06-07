/**
 * Atomically updates all values using a pure function.
 *
 * @tsplus fluent ets/TMap transformValues
 */
export function transformValues_<K, V>(
  self: TMap<K, V>,
  f: (v: V) => V
): USTM<void> {
  return self.transform((kv) => Tuple(kv.get(0), f(kv.get(1))))
}

/**
 * Atomically updates all values using a pure function.
 *
 * @tsplus static ets/TMap/Aspects transformValues
 */
export const transformValues = Pipeable(transformValues_)
