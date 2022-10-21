import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

/**
 * Takes the first matching value, or retries until there is one.
 *
 * @tsplus static effect/core/stm/TMap.Aspects takeFirst
 * @tsplus pipeable effect/core/stm/TMap takeFirst
 */
export function takeFirst<K, V, A>(pf: (kv: readonly [K, V]) => Maybe<A>) {
  return (self: TMap<K, V>): STM<never, never, A> => {
    concreteTMap(self)
    return STM.Effect<never, Maybe<A>>((journal) => {
      let result: Maybe<A> = Maybe.none

      const size = self.tSize.unsafeGet(journal)
      const buckets = self.tBuckets.unsafeGet(journal)

      concreteTArray(buckets)

      const capacity = buckets.chunk.length

      let i = 0

      while (i < capacity && (result.isNone())) {
        const bucket = buckets.chunk.unsafeGet(i)!.unsafeGet(journal)
        const recreate = bucket.exists((_) => pf(_).isSome())

        if (recreate) {
          let newBucket = List.empty<readonly [K, V]>()

          for (const pair of bucket) {
            result = pf(pair)
            if (result.isSome()) {
              newBucket = newBucket.prepend(pair)
              break
            }
          }

          buckets.chunk.unsafeGet(i)!.unsafeSet(newBucket, journal)
        }

        i += 1
      }

      if (result.isSome()) {
        self.tSize.unsafeSet(size - 1, journal)
      }

      return result
    })
      .continueOrRetry(identity)
  }
}
