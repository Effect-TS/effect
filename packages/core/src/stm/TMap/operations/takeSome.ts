import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"
import * as Chunk from "@fp-ts/data/Chunk"
import { identity, pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

/**
 * Takes all matching values, or retries until there is at least one.
 *
 * @tsplus static effect/core/stm/TMap.Aspects takeSome
 * @tsplus pipeable effect/core/stm/TMap takeSome
 * @category mutations
 * @since 1.0.0
 */
export function takeSome<K, V, A>(pf: (kv: readonly [K, V]) => Option.Option<A>) {
  return (self: TMap<K, V>): STM<never, never, Chunk.Chunk<A>> => { // todo: rewrite to NonEmptyChunk<A>
    concreteTMap(self)
    return STM.Effect<never, Option.Option<Chunk.Chunk<A>>>((journal) => {
      const buckets = self.tBuckets.unsafeGet(journal)
      const builder: Array<A> = []

      concreteTArray(buckets)

      const capacity = buckets.chunk.length

      let i = 0
      let newSize = 0

      while (i < capacity) {
        const bucket = pipe(buckets.chunk, Chunk.unsafeGet(i)).unsafeGet(journal)
        const recreate = pipe(
          bucket,
          List.findFirst((entry) => Option.isSome(pf(entry))),
          Option.isSome
        )

        if (recreate) {
          let newBucket = List.empty<readonly [K, V]>()

          for (const pair of bucket) {
            const result = pf(pair)
            if (Option.isSome(result)) {
              builder.push(result.value)
            } else {
              newBucket = pipe(newBucket, List.prepend(pair))
              newSize += 1
            }
          }

          pipe(buckets.chunk, Chunk.unsafeGet(i)).unsafeSet(newBucket, journal)
        } else {
          newSize += Array.from(bucket).length
        }

        i += 1
      }

      self.tSize.unsafeSet(newSize, journal)

      if (builder.length > 0) {
        return Option.some(Chunk.fromIterable(builder))
      }
      return Option.none
    }).continueOrRetry(identity)
  }
}
