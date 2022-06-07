import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

/**
 * Deletes all entries associated with the specified keys.
 *
 * @tsplus fluent ets/TMap deleteAll
 */
export function deleteAll_<K, V>(self: TMap<K, V>, ks: Collection<K>): USTM<void> {
  concreteTMap(self)
  return STM.Effect((journal) => {
    Chunk.from(ks).forEach((k) => {
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
  })
}

/**
 * Deletes all entries associated with the specified keys.
 *
 * @tsplus static ets/TMap/Aspects deleteAll
 */
export const deleteAll = Pipeable(deleteAll_)
