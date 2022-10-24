/**
 * Atomically updates all values using a pure function.
 *
 * @tsplus static effect/core/stm/TMap.Aspects transformValues
 * @tsplus pipeable effect/core/stm/TMap transformValues
 * @category mutations
 * @since 1.0.0
 */
export function transformValues<V>(f: (v: V) => V) {
  return <K>(self: TMap<K, V>): STM<never, never, void> => self.transform((kv) => [kv[0], f(kv[1])])
}
