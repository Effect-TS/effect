import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

/**
 * Retrieves value associated with given key.
 *
 * @tsplus static effect/core/stm/TMap.Aspects get
 * @tsplus pipeable effect/core/stm/TMap get
 * @category mutations
 * @since 1.0.0
 */
export function get<K>(k: K) {
  return <V>(self: TMap<K, V>): STM<never, never, Option.Option<V>> => {
    concreteTMap(self)
    return STM.Effect((journal) => {
      const buckets = self.tBuckets.unsafeGet(journal)

      concreteTArray(buckets)

      const idx = TMap.indexOf(k, buckets.chunk.length)
      const bucket = pipe(buckets.chunk, Chunk.unsafeGet(idx)).unsafeGet(journal)

      return pipe(
        bucket,
        List.findFirst((entry) => Equal.equals(entry[0], k)),
        Option.map((_) => _[1])
      )
    })
  }
}
