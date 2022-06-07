import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

/**
 * Removes bindings matching predicate.
 *
 * @tsplus fluent ets/TMap removeIfDiscard
 */
export function removeIfDiscard_<K, V>(
  self: TMap<K, V>,
  f: (kv: Tuple<[K, V]>) => boolean
): USTM<void> {
  concreteTMap(self)
  return STM.Effect((journal) => {
    const buckets = self.tBuckets.unsafeGet(journal)

    concreteTArray(buckets)

    const capacity = buckets.chunk.length

    let i = 0
    let newSize = 0

    while (i < capacity) {
      const bucket = buckets.chunk.unsafeGet(i)!.unsafeGet(journal)
      let newBucket = List.empty<Tuple<[K, V]>>()

      for (const pair of bucket) {
        if (!f(pair)) {
          newBucket = newBucket.prepend(pair)
          newSize += 1
        }
      }

      buckets.chunk.unsafeGet(i)!.unsafeSet(newBucket, journal)
      i += 1
    }

    self.tSize.unsafeSet(newSize, journal)
  })
}

/**
 * Removes bindings matching predicate.
 *
 * @tsplus static ets/TMap/Aspects removeIfDiscard
 */
export const removeIfDiscard = Pipeable(removeIfDiscard_)
