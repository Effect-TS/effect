import { identity } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/stm/TMap.Aspects takeFirstSTM
 * @tsplus pipeable effect/core/stm/TMap takeFirstSTM
 * @category mutations
 * @since 1.0.0
 */
export function takeFirstSTM<K, V, R, E, A>(
  pf: (kv: readonly [K, V]) => STM<R, Option<E>, A>
) {
  return (self: TMap<K, V>): STM<R, E, A> =>
    self
      .findSTM((kv) => pf(kv).map((a) => [kv[0], a] as const))
      .continueOrRetry(identity)
      .flatMap((kv) => self.delete(kv[0]).as(kv[1]))
}
