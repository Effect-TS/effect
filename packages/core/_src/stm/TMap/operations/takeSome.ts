import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

/**
 * Takes all matching values, or retries until there is at least one.
 *
 * @tsplus static effect/core/stm/TMap.Aspects takeSome
 * @tsplus pipeable effect/core/stm/TMap takeSome
 */
export function takeSome<K, V, A>(pf: (kv: Tuple<[K, V]>) => Maybe<A>) {
  return (self: TMap<K, V>): STM<never, never, Chunk<A>> => { // todo: rewrite to NonEmptyChunk<A>
    concreteTMap(self)
    return STM.Effect<never, Maybe<Chunk<A>>>((journal) => {
      const buckets = self.tBuckets.unsafeGet(journal)
      const chunkBuilder = Chunk.builder<A>()

      concreteTArray(buckets)

      const capacity = buckets.chunk.length

      let i = 0
      let newSize = 0

      while (i < capacity) {
        const bucket = buckets.chunk.unsafeGet(i)!.unsafeGet(journal)
        const recreate = bucket.exists((_) => pf(_).isSome())

        if (recreate) {
          let newBucket = List.empty<Tuple<[K, V]>>()

          for (const pair of bucket) {
            const result = pf(pair)
            if (result.isSome()) {
              chunkBuilder.append(result.value)
            } else {
              newBucket = newBucket.prepend(pair)
              newSize += 1
            }
          }

          buckets.chunk.unsafeGet(i)!.unsafeSet(newBucket, journal)
        } else {
          newSize += bucket.length
        }

        i += 1
      }

      self.tSize.unsafeSet(newSize, journal)

      return Maybe.fromPredicate(chunkBuilder.build(), (_) => _.size > 0)
    })
      .continueOrRetry(identity)
  }
}
