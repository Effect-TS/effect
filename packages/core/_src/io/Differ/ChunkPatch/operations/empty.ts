import type { ChunkPatch } from "@effect/core/io/Differ/ChunkPatch/definition"
import { EmptyChunkPatch } from "@effect/core/io/Differ/ChunkPatch/definition"

/**
 * Constructs an empty chunk patch.
 *
 * @tsplus static effect/core/io/Differ.ChunkPatch.Ops empty
 */
export function empty<Value, Patch>(): ChunkPatch<Value, Patch> {
  return new EmptyChunkPatch()
}
