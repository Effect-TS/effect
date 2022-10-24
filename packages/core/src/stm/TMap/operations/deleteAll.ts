import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"

/**
 * Deletes all entries associated with the specified keys.
 *
 * @tsplus static effect/core/stm/TMap.Aspects deleteAll
 * @tsplus pipeable effect/core/stm/TMap deleteAll
 * @category mutations
 * @since 1.0.0
 */
export function deleteAll<K>(ks: Iterable<K>) {
  return <V>(self: TMap<K, V>): STM<never, never, void> => {
    concreteTMap(self)
    return STM.Effect((journal) => {
      Array.from(ks).forEach((k) => {
        const buckets = self.tBuckets.unsafeGet(journal)

        concreteTArray(buckets)

        const idx = TMap.indexOf(k, buckets.chunk.length)
        const bucket = pipe(buckets.chunk, Chunk.unsafeGet(idx)).unsafeGet(journal)

        const [toRemove, toRetain] = pipe(bucket, List.partition((_) => !Equal.equals(_[0], k)))

        if (List.isCons(toRemove)) {
          const currSize = self.tSize.unsafeGet(journal)

          pipe(buckets.chunk, Chunk.unsafeGet(idx)).unsafeSet(toRetain, journal)

          self.tSize.unsafeSet(currSize - 1, journal)
        }
      })
    })
  }
}
