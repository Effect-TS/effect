import type { ChunkPatch } from "@effect/core/io/Differ/ChunkPatch/definition"
import {
  AppendChunkPatch,
  SliceChunkPatch,
  UpdateChunkPatch
} from "@effect/core/io/Differ/ChunkPatch/definition"

/**
 * Constructs a chunk patch from a new and old chunk of values and a differ
 * for the values.
 *
 * @tsplus static effect/core/io/Differ.ChunkPatch.Ops diff
 */
export function diff<Value, Patch>(
  oldValue: Chunk<Value>,
  newValue: Chunk<Value>,
  differ: Differ<Value, Patch>
): ChunkPatch<Value, Patch> {
  let i = 0
  let patch = Differ.ChunkPatch.empty<Value, Patch>()
  while (i < oldValue.length && i < newValue.length) {
    const oldElement = oldValue.unsafeGet(i)
    const newElement = newValue.unsafeGet(i)
    const valuePatch = differ.diff(oldElement, newElement)
    if (!Equals.equals(valuePatch, differ.empty)) {
      patch = patch.combine(new UpdateChunkPatch(i, valuePatch))
    }
    i = i + 1
  }
  if (i < oldValue.length) {
    patch = patch.combine(new SliceChunkPatch(0, i))
  }
  if (i < newValue.length) {
    patch = patch.combine(new AppendChunkPatch(newValue.drop(i)))
  }
  return patch
}
