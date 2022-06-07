import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

/**
 * Removes bindings matching predicate and returns the removed entries.
 *
 * @tsplus fluent ets/TMap removeIf
 */
export function removeIf_<K, V>(self: TMap<K, V>, f: (kv: Tuple<[K, V]>) => boolean): USTM<Chunk<Tuple<[K, V]>>> {
  concreteTMap(self)
  return STM.Effect((journal) => {
    const buckets = self.tBuckets.unsafeGet(journal)

    concreteTArray(buckets)

    const capacity = buckets.chunk.length

    let i = 0
    let newSize = 0
    const removed = Chunk.builder<Tuple<[K, V]>>()

    while (i < capacity) {
      const bucket = buckets.chunk.unsafeGet(i)!.unsafeGet(journal)
      let newBucket = List.empty<Tuple<[K, V]>>()

      for (const pair of bucket) {
        if (!f(pair)) {
          newBucket = newBucket.prepend(pair)
          newSize += 1
        } else {
          removed.append(pair)
        }
      }

      buckets.chunk.unsafeGet(i)!.unsafeSet(newBucket, journal)
      i += 1
    }

    self.tSize.unsafeSet(newSize, journal)

    return removed.build()
  })
}

/**
 * Removes bindings matching predicate and returns the removed entries.
 *
 * @tsplus static ets/TMap/Aspects removeIf
 */
export const removeIf = Pipeable(removeIf_)
