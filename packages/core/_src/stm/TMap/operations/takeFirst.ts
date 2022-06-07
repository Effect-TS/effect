import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

/**
 * Takes the first matching value, or retries until there is one.
 *
 * @tsplus fluent ets/TMap takeFirst
 */
export function takeFirst_<K, V, A>(
  self: TMap<K, V>,
  pf: (kv: Tuple<[K, V]>) => Option<A>
): USTM<A> {
  concreteTMap(self)
  return STM.Effect<never, Option<A>>((journal) => {
    let result: Option<A> = Option.none

    const size = self.tSize.unsafeGet(journal)
    const buckets = self.tBuckets.unsafeGet(journal)

    concreteTArray(buckets)

    const capacity = buckets.chunk.length

    let i = 0

    while (i < capacity && (result.isNone())) {
      const bucket = buckets.chunk.unsafeGet(i)!.unsafeGet(journal)
      const recreate = bucket.exists((_) => pf(_).isSome())

      if (recreate) {
        let newBucket = List.empty<Tuple<[K, V]>>()

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

/**
 * Takes the first matching value, or retries until there is one.
 *
 * @tsplus static ets/TMap/Aspects takeFirst
 */
export const takeFirst = Pipeable(takeFirst_)
