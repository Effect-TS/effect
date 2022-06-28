/**
 * @tsplus static effect/core/stm/TMap.Aspects takeFirstSTM
 * @tsplus pipeable effect/core/stm/TMap takeFirstSTM
 */
export function takeFirstSTM<K, V, R, E, A>(
  pf: (kv: Tuple<[K, V]>) => STM<R, Maybe<E>, A>
) {
  return (self: TMap<K, V>): STM<R, E, A> =>
    self.findSTM((kv) => pf(kv).map((a) => Tuple(kv.get(0), a))).continueOrRetry(identity).flatMap((kv) =>
      self.delete(kv.get(0)).as(kv.get(1))
    )
}
