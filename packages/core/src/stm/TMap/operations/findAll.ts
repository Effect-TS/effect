import type { Chunk } from "@fp-ts/data/Chunk"
import * as Option from "@fp-ts/data/Option"

/**
 * Finds all the key/value pairs matching the specified predicate, and uses
 * the provided function to extract values out them.
 *
 * @tsplus static effect/core/stm/TMap.Aspects findAll
 * @tsplus pipeable effect/core/stm/TMap findAll
 * @category elements
 * @since 1.0.0
 */
export function findAll<K, V, A>(pf: (kv: readonly [K, V]) => Option.Option<A>) {
  return (self: TMap<K, V>): STM<never, never, Chunk<A>> =>
    self.findAllSTM((kv) => {
      const option = pf(kv)
      switch (option._tag) {
        case "None": {
          return STM.fail(Option.none)
        }
        case "Some": {
          return STM.succeed(option.value)
        }
      }
    })
}
