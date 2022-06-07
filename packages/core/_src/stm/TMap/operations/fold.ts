import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

/**
 * Atomically folds using a pure function.
 *
 * @tsplus fluent ets/TMap fold
 */
export function fold_<K, V, A>(self: TMap<K, V>, zero: A, op: (a: A, kv: Tuple<[K, V]>) => A): USTM<A> {
  concreteTMap(self)
  return STM.Effect((journal) => {
    const buckets = self.tBuckets.unsafeGet(journal)

    concreteTArray(buckets)

    let res = zero
    let i = 0

    while (i < buckets.chunk.length) {
      const bucket = buckets.chunk.unsafeGet(i)
      const items = bucket!.unsafeGet(journal)

      res = items.reduce(res, op)

      i += 1
    }

    return res
  })
}

/**
 * Atomically folds using a pure function.
 *
 * @tsplus static ets/TMap/Aspects fold
 */
export const fold = Pipeable(fold_)
