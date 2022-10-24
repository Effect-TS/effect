import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"

/**
 * Finds all the key/value pairs matching the specified predicate, and uses
 * the provided effectful function to extract values out of them..
 *
 * @tsplus static effect/core/stm/TMap.Aspects findAllSTM
 * @tsplus pipeable effect/core/stm/TMap findAllSTM
 * @category elements
 * @since 1.0.0
 */
export function findAllSTM<K, V, R, E, A>(
  pf: (kv: readonly [K, V]) => STM<R, Option<E>, A>
) {
  return (self: TMap<K, V>): STM<R, E, Chunk.Chunk<A>> =>
    self.foldSTM(
      Chunk.empty as Chunk.Chunk<A>,
      (acc, kv) =>
        pf(kv).foldSTM((option) => {
          switch (option._tag) {
            case "None": {
              return STM.succeed(acc)
            }
            case "Some": {
              return STM.fail(option.value)
            }
          }
        }, (a) => STM.succeed(pipe(acc, Chunk.append(a))))
    )
}
