import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

/**
 * Retrieves value associated with given key.
 *
 * @tsplus fluent ets/TMap get
 */
export function get_<K, V>(self: TMap<K, V>, k: K): USTM<Maybe<V>> {
  concreteTMap(self)
  return STM.Effect((journal) => {
    const buckets = self.tBuckets.unsafeGet(journal)

    concreteTArray(buckets)

    const idx = TMap.indexOf(k, buckets.chunk.length)
    const bucket = buckets.chunk.unsafeGet(idx)!.unsafeGet(journal)

    return bucket.find((_) => Equals.equals(_.get(0), k)).map((_) => _.get(1))
  })
}

/**
 * Retrieves value associated with given key.
 *
 * @tsplus static ets/TMap/Aspects get
 */
export const get = Pipeable(get_)
