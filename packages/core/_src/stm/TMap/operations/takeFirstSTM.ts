/**
 * @tsplus fluent ets/TMap takeFirstSTM
 */
export function takeFirstSTM_<K, V, R, E, A>(
  self: TMap<K, V>,
  pf: (kv: Tuple<[K, V]>) => STM<R, Option<E>, A>
): STM<R, E, A> {
  return self.findSTM((kv) => pf(kv).map((a) => Tuple(kv.get(0), a))).continueOrRetry(identity).flatMap((kv) =>
    self.delete(kv.get(0)).as(kv.get(1))
  )
}

/**
 * @tsplus static ets/TMap/Aspects takeFirstSTM
 */
export const takeFirstSTM = Pipeable(takeFirstSTM_)
