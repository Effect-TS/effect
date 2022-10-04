import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import { concreteTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

/**
 * Collects all bindings into a chunk.
 *
 * @tsplus getter effect/core/stm/TMap toChunk
 */
export function toChunk<K, V>(
  self: TMap<K, V>
): USTM<Chunk<readonly [K, V]>> {
  concreteTMap(self)
  return STM.Effect((journal) => {
    const buckets = self.tBuckets.unsafeGet(journal)

    concreteTArray(buckets)

    const capacity = buckets.chunk.length
    let i = 0
    const builder = Chunk.builder<readonly [K, V]>()

    while (i < capacity) {
      const bucket = buckets.chunk.unsafeGet(i)

      bucket.unsafeGet(journal)!.forEach((_) => builder.append(_))

      i += 1
    }

    return builder.build()
  })
}
