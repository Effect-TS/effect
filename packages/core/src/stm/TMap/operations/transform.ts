import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

/**
 * Atomically updates all bindings using a pure function.
 *
 * @tsplus static effect/core/stm/TMap.Aspects transform
 * @tsplus pipeable effect/core/stm/TMap transform
 * @category mutations
 * @since 1.0.0
 */
export function transform<K, V>(f: (kv: readonly [K, V]) => readonly [K, V]) {
  return (self: TMap<K, V>): STM<never, never, void> => {
    concreteTMap(self)
    return STM.Effect((journal) => {
      const buckets = self.tBuckets.unsafeGet(journal)

      concreteTArray(buckets)

      const capacity = buckets.chunk.length
      const newBuckets: Array<List.List<readonly [K, V]>> = Array.from(
        { length: capacity },
        () => List.nil()
      )
      let i = 0
      let newSize = 0

      while (i < capacity) {
        const bucket = pipe(buckets.chunk, Chunk.unsafeGet(i))
        const pairs = bucket!.unsafeGet(journal)

        for (const pair of pairs) {
          const newPair = f(pair)
          const idx = TMap.indexOf(newPair[0], capacity)
          const newBucket = newBuckets[idx]!

          if (
            pipe(
              newBucket,
              List.findFirst((entry) => Equal.equals(entry[0], newPair[0])),
              Option.isNone
            )
          ) {
            newBuckets[idx] = pipe(newBucket, List.prepend(newPair))
            newSize += 1
          }
        }

        i += 1
      }

      i = 0

      while (i < capacity) {
        pipe(buckets.chunk, Chunk.unsafeGet(i)).unsafeSet(newBuckets[i]!, journal)
        i += 1
      }

      self.tSize.unsafeSet(newSize, journal)
    })
  }
}
