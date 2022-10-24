import type { Journal } from "@effect/core/stm/STM/definition/primitives"
import {
  concreteTArray,
  InternalTArray
} from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

const LOAD_FACTOR = .75 as const

function resize<K, V>(
  self: TMap<K, V>,
  journal: Journal,
  buckets: TArray<List.List<readonly [K, V]>>,
  k: K,
  v: V
): void {
  concreteTArray(buckets)
  const capacity = buckets.chunk.length
  const newCapacity = capacity << 1
  const newBuckets: Array<List.List<readonly [K, V]>> = Array.from(
    { length: newCapacity },
    () => List.nil()
  )
  let i = 0

  while (i < capacity) {
    const pairs = pipe(buckets.chunk, Chunk.unsafeGet(i)).unsafeGet(journal)

    for (const pair of pairs) {
      const idx = TMap.indexOf(pair[0], newCapacity)

      newBuckets[idx] = List.cons(pair, newBuckets[idx]!)
    }

    i += 1
  }

  const newIdx = TMap.indexOf(k, newCapacity)
  newBuckets[newIdx] = List.cons([k, v], newBuckets[newIdx]!)

  const newArray: Array<TRef<List.List<readonly [K, V]>>> = new Array(newCapacity)

  i = 0
  while (i < newCapacity) {
    newArray[i] = TRef.unsafeMake(newBuckets[i]!)
    i += 1
  }

  concreteTMap(self)

  self.tBuckets.unsafeSet(new InternalTArray(Chunk.fromIterable(newArray)), journal)
}

/**
 * Stores new binding into the map.
 *
 * @tsplus static effect/core/stm/TMap.Aspects put
 * @tsplus pipeable effect/core/stm/TMap put
 * @category mutations
 * @since 1.0.0
 */
export function put<K, V>(k: K, v: V) {
  return (self: TMap<K, V>): STM<never, never, void> => {
    concreteTMap(self)
    return STM.Effect((journal) => {
      const buckets = self.tBuckets.unsafeGet(journal)

      concreteTArray(buckets)

      const capacity = buckets.chunk.length
      const idx = TMap.indexOf(k, capacity)
      const bucket = pipe(buckets.chunk, Chunk.unsafeGet(idx)).unsafeGet(journal)
      const shouldUpdate = pipe(
        bucket,
        List.findFirst((entry) => Equal.equals(entry[0], k)),
        Option.isSome
      )

      if (shouldUpdate) {
        const newBucket = pipe(bucket, List.map((kv) => Equal.equals(kv[0], k) ? [k, v] : kv))
        pipe(buckets.chunk, Chunk.unsafeGet(idx)).unsafeSet(newBucket, journal)
      } else {
        const newSize = self.tSize.unsafeGet(journal) + 1

        self.tSize.unsafeSet(newSize, journal)

        if (capacity * LOAD_FACTOR < newSize) {
          resize(self, journal, buckets, k, v)
        } else {
          const newBucket = List.cons([k, v], bucket)
          pipe(buckets.chunk, Chunk.unsafeGet(idx)).unsafeSet(newBucket, journal)
        }
      }
    })
  }
}
