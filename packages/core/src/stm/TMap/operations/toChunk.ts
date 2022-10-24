import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"

/**
 * Collects all bindings into a chunk.
 *
 * @tsplus getter effect/core/stm/TMap toChunk
 * @category conversions
 * @since 1.0.0
 */
export function toChunk<K, V>(
  self: TMap<K, V>
): USTM<Chunk.Chunk<readonly [K, V]>> {
  concreteTMap(self)
  return STM.Effect((journal) => {
    const buckets = self.tBuckets.unsafeGet(journal)

    concreteTArray(buckets)

    const capacity = buckets.chunk.length
    let i = 0
    const builder: Array<readonly [K, V]> = []

    while (i < capacity) {
      const bucket = pipe(buckets.chunk, Chunk.unsafeGet(i))

      pipe(bucket.unsafeGet(journal), List.forEach((entry) => builder.push(entry)))

      i += 1
    }

    return Chunk.fromIterable(builder)
  })
}
