import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"

/**
 * Atomically folds using a pure function.
 *
 * @tsplus static effect/core/stm/TMap.Aspects fold
 * @tsplus pipeable effect/core/stm/TMap fold
 * @category folding
 * @since 1.0.0
 */
export function fold<K, V, A>(zero: A, op: (acc: A, kv: readonly [K, V]) => A) {
  return (self: TMap<K, V>): STM<never, never, A> => {
    concreteTMap(self)
    return STM.Effect((journal) => {
      const buckets = self.tBuckets.unsafeGet(journal)

      concreteTArray(buckets)

      let res = zero
      let i = 0

      while (i < buckets.chunk.length) {
        const bucket = pipe(buckets.chunk, Chunk.unsafeGet(i))
        const items = bucket!.unsafeGet(journal)

        res = pipe(items, List.reduce(res, op))

        i += 1
      }

      return res
    })
  }
}
