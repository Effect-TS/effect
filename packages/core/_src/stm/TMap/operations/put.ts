import type { Journal } from "@effect/core/stm/STM/Journal"
import {
  concreteTArray,
  InternalTArray
} from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

const LOAD_FACTOR = .75 as const

function resize<K, V>(
  self: TMap<K, V>,
  journal: Journal,
  buckets: TArray<List<readonly [K, V]>>,
  k: K,
  v: V
): void {
  concreteTArray(buckets)
  const capacity = buckets.chunk.length
  const newCapacity = capacity << 1
  const newBuckets: Array<List<readonly [K, V]>> = Array.from(
    { length: newCapacity },
    () => List.nil()
  )
  let i = 0

  while (i < capacity) {
    const pairs = buckets.chunk.unsafeGet(i)!.unsafeGet(journal)

    for (const pair of pairs) {
      const idx = TMap.indexOf(pair[0], newCapacity)

      newBuckets[idx] = List.cons(pair, newBuckets[idx]!)
    }

    i += 1
  }

  const newIdx = TMap.indexOf(k, newCapacity)
  newBuckets[newIdx] = List.cons([k, v], newBuckets[newIdx]!)

  const newArray: Array<TRef<List<readonly [K, V]>>> = new Array(newCapacity)

  i = 0
  while (i < newCapacity) {
    newArray[i] = TRef.unsafeMake(newBuckets[i]!)
    i += 1
  }

  concreteTMap(self)

  self.tBuckets.unsafeSet(new InternalTArray(Chunk.from(newArray)), journal)
}

/**
 * Stores new binding into the map.
 *
 * @tsplus static effect/core/stm/TMap.Aspects put
 * @tsplus pipeable effect/core/stm/TMap put
 */
export function put<K, V>(k: K, v: V) {
  return (self: TMap<K, V>): STM<never, never, void> => {
    concreteTMap(self)
    return STM.Effect((journal) => {
      const buckets = self.tBuckets.unsafeGet(journal)

      concreteTArray(buckets)

      const capacity = buckets.chunk.length
      const idx = TMap.indexOf(k, capacity)
      const bucket = buckets.chunk.unsafeGet(idx)!.unsafeGet(journal)
      const shouldUpdate = bucket.exists((_) => Equals.equals(_[0], k))

      if (shouldUpdate) {
        const newBucket = bucket.map((kv) => Equals.equals(kv[0], k) ? [k, v] : kv)
        buckets.chunk.unsafeGet(idx)!.unsafeSet(newBucket, journal)
      } else {
        const newSize = self.tSize.unsafeGet(journal) + 1

        self.tSize.unsafeSet(newSize, journal)

        if (capacity * LOAD_FACTOR < newSize) {
          resize(self, journal, buckets, k, v)
        } else {
          const newBucket = List.cons([k, v], bucket)
          buckets.chunk.unsafeGet(idx)!.unsafeSet(newBucket, journal)
        }
      }
    })
  }
}
