/**
 * Makes a new `TMap` that is initialized with specified values.
 *
 * @tsplus static effect/core/stm/TMap.Ops make
 * @tsplus static effect/core/stm/TMap.Ops __call
 * @category constructors
 * @since 1.0.0
 */
export function make<K, V>(...data: Array<readonly [K, V]>): USTM<TMap<K, V>> {
  return TMap.fromIterable(data)
}
