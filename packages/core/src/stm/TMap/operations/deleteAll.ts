import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

/**
 * Deletes all entries associated with the specified keys.
 *
 * @tsplus static effect/core/stm/TMap.Aspects deleteAll
 * @tsplus pipeable effect/core/stm/TMap deleteAll
 */
export function deleteAll<K>(ks: Collection<K>) {
  return <V>(self: TMap<K, V>): STM<never, never, void> => {
    concreteTMap(self)
    return STM.Effect((journal) => {
      Chunk.from(ks).forEach((k) => {
        const buckets = self.tBuckets.unsafeGet(journal)

        concreteTArray(buckets)

        const idx = TMap.indexOf(k, buckets.chunk.length)
        const bucket = buckets.chunk.unsafeGet(idx)!.unsafeGet(journal)

        const [toRemove, toRetain] = bucket.partition((_) => !Equals.equals(_[0], k))

        if (toRemove.isCons()) {
          const currSize = self.tSize.unsafeGet(journal)

          buckets.chunk.unsafeGet(idx)!.unsafeSet(toRetain, journal)

          self.tSize.unsafeSet(currSize - 1, journal)
        }
      })
    })
  }
}
