import { ChunkPatch } from "@effect/core/io/Differ/ChunkPatch/definition"

/**
 * Constructs a differ that knows how to diff a `Chunk` of values given a
 * differ that knows how to diff the values.
 *
 * @tsplus static effect/core/io/Differ.Ops chunk
 */
export function chunk<Value, Patch>(
  differ: Differ<Value, Patch>
): Differ<Chunk<Value>, ChunkPatch<Value, Patch>> {
  return Differ.make({
    empty: ChunkPatch.empty(),
    combine: (first, second) => first.combine(second),
    diff: (oldValue, newValue) => ChunkPatch.diff(oldValue, newValue, differ),
    patch: (patch, oldValue) => patch.apply(oldValue, differ)
  })
}
