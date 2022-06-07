/**
 * Atomically performs transactional-effect for each binding present in map.
 *
 * @tsplus fluent ets/TMap forEach
 */
export function forEach_<K, V, R, E>(self: TMap<K, V>, f: (kv: Tuple<[K, V]>) => STM<R, E, void>): STM<R, E, void> {
  return self.foldSTM(undefined as void, (_, kv) => f(kv))
}

/**
 * Atomically performs transactional-effect for each binding present in map.
 *
 * @tsplus static ets/TMap/Aspects forEach
 */
export const forEach = Pipeable(forEach_)
