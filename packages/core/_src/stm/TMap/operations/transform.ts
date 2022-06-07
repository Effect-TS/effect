import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

/**
 * Atomically updates all bindings using a pure function.
 *
 * @tsplus fluent ets/TMap transform
 */
export function transform_<K, V>(
  self: TMap<K, V>,
  f: (kv: Tuple<[K, V]>) => Tuple<[K, V]>
): USTM<void> {
  concreteTMap(self)
  return STM.Effect((journal) => {
    const buckets = self.tBuckets.unsafeGet(journal)

    concreteTArray(buckets)

    const capacity = buckets.chunk.length
    const newBuckets: Array<List<Tuple<[K, V]>>> = Array.from({ length: capacity }, () => List.nil())
    let i = 0
    let newSize = 0

    while (i < capacity) {
      const bucket = buckets.chunk.unsafeGet(i)
      const pairs = bucket!.unsafeGet(journal)

      for (const pair of pairs) {
        const newPair = f(pair)
        const idx = TMap.indexOf(newPair.get(0), capacity)
        const newBucket = newBuckets[idx]!

        if (!newBucket.exists((_) => Equals.equals(_.get(0), newPair.get(0)))) {
          newBuckets[idx] = newBucket.prepend(newPair)
          newSize += 1
        }
      }

      i += 1
    }

    i = 0

    while (i < capacity) {
      buckets.chunk.unsafeGet(i)!.unsafeSet(newBuckets[i]!, journal)
      i += 1
    }

    self.tSize.unsafeSet(newSize, journal)
  })
}

/**
 * Atomically updates all bindings using a pure function.
 *
 * @tsplus static ets/TMap/Aspects transform
 */
export const transform = Pipeable(transform_)
