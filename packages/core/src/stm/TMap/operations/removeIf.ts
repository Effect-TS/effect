import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"

/**
 * Removes bindings matching predicate and returns the removed entries.
 *
 * @tsplus static effect/core/stm/TMap.Aspects removeIf
 * @tsplus pipeable effect/core/stm/TMap removeIf
 * @category mutations
 * @since 1.0.0
 */
export function removeIf<K, V>(f: (kv: readonly [K, V]) => boolean) {
  return (self: TMap<K, V>): STM<never, never, Chunk.Chunk<readonly [K, V]>> => {
    concreteTMap(self)
    return STM.Effect((journal) => {
      const buckets = self.tBuckets.unsafeGet(journal)

      concreteTArray(buckets)

      const capacity = buckets.chunk.length

      let i = 0
      let newSize = 0
      const removed: Array<readonly [K, V]> = []

      while (i < capacity) {
        const bucket = pipe(buckets.chunk, Chunk.unsafeGet(i)).unsafeGet(journal)
        let newBucket = List.empty<readonly [K, V]>()

        for (const pair of bucket) {
          if (!f(pair)) {
            newBucket = pipe(newBucket, List.prepend(pair))
            newSize += 1
          } else {
            removed.push(pair)
          }
        }

        pipe(buckets.chunk, Chunk.unsafeGet(i)).unsafeSet(newBucket, journal)
        i += 1
      }

      self.tSize.unsafeSet(newSize, journal)

      return Chunk.fromIterable(removed)
    })
  }
}
