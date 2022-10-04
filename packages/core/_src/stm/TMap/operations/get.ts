import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

/**
 * Retrieves value associated with given key.
 *
 * @tsplus static effect/core/stm/TMap.Aspects get
 * @tsplus pipeable effect/core/stm/TMap get
 */
export function get<K>(k: K) {
  return <V>(self: TMap<K, V>): STM<never, never, Maybe<V>> => {
    concreteTMap(self)
    return STM.Effect((journal) => {
      const buckets = self.tBuckets.unsafeGet(journal)

      concreteTArray(buckets)

      const idx = TMap.indexOf(k, buckets.chunk.length)
      const bucket = buckets.chunk.unsafeGet(idx)!.unsafeGet(journal)

      return bucket.find((_) => Equals.equals(_[0], k)).map((_) => _[1])
    })
  }
}
