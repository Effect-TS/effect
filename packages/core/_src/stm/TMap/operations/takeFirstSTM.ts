/**
 * @tsplus static effect/core/stm/TMap.Aspects takeFirstSTM
 * @tsplus pipeable effect/core/stm/TMap takeFirstSTM
 */
export function takeFirstSTM<K, V, R, E, A>(
  pf: (kv: readonly [K, V]) => STM<R, Maybe<E>, A>
) {
  return (self: TMap<K, V>): STM<R, E, A> =>
    self.findSTM((kv) => pf(kv).map((a) => [kv[0], a] as const)).continueOrRetry(identity).flatMap((
      kv
    ) => self.delete(kv[0]).as(kv[1]))
}
