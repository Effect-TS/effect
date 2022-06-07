import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

/**
 * Removes binding for given key.
 *
 * @tsplus fluent ets/TMap delete
 */
export function delete_<K, V>(self: TMap<K, V>, k: K): USTM<void> {
  concreteTMap(self)
  return STM.Effect((journal) => {
    const buckets = self.tBuckets.unsafeGet(journal)

    concreteTArray(buckets)

    const idx = TMap.indexOf(k, buckets.chunk.length)
    const bucket = buckets.chunk.unsafeGet(idx)!.unsafeGet(journal)

    const { tuple: [toRemove, toRetain] } = bucket.partition((_) => !Equals.equals(_.get(0), k))

    if (toRemove.isCons()) {
      const currSize = self.tSize.unsafeGet(journal)

      buckets.chunk.unsafeGet(idx)!.unsafeSet(toRetain, journal)

      self.tSize.unsafeSet(currSize - 1, journal)
    }
  })
}

/**
 * Removes binding for given key.
 *
 * @tsplus static ets/TMap/Aspects delete
 */
export const _delete = Pipeable(delete_)

export { _delete as delete }
