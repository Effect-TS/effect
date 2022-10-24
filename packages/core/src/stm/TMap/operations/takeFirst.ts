import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"
import * as Chunk from "@fp-ts/data/Chunk"
import { identity, pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

/**
 * Takes the first matching value, or retries until there is one.
 *
 * @tsplus static effect/core/stm/TMap.Aspects takeFirst
 * @tsplus pipeable effect/core/stm/TMap takeFirst
 * @category mutations
 * @since 1.0.0
 */
export function takeFirst<K, V, A>(pf: (kv: readonly [K, V]) => Option.Option<A>) {
  return (self: TMap<K, V>): STM<never, never, A> => {
    concreteTMap(self)
    return STM.Effect<never, Option.Option<A>>((journal) => {
      let result: Option.Option<A> = Option.none

      const size = self.tSize.unsafeGet(journal)
      const buckets = self.tBuckets.unsafeGet(journal)

      concreteTArray(buckets)

      const capacity = buckets.chunk.length

      let i = 0

      while (i < capacity && (Option.isNone(result))) {
        const bucket = pipe(buckets.chunk, Chunk.unsafeGet(i)).unsafeGet(journal)
        const recreate = pipe(
          bucket,
          List.findFirst((entry) => Option.isSome(pf(entry))),
          Option.isSome
        )

        if (recreate) {
          let newBucket = List.empty<readonly [K, V]>()

          for (const pair of bucket) {
            result = pf(pair)
            if (Option.isSome(result)) {
              newBucket = pipe(newBucket, List.prepend(pair))
              break
            }
          }

          pipe(buckets.chunk, Chunk.unsafeGet(i)).unsafeSet(newBucket, journal)
        }

        i += 1
      }

      if (Option.isSome(result)) {
        self.tSize.unsafeSet(size - 1, journal)
      }

      return result
    }).continueOrRetry(identity)
  }
}
