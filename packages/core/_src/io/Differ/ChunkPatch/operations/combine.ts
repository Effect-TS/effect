import type { ChunkPatch } from "@effect/core/io/Differ/ChunkPatch/definition"
import { AndThenChunkPatch } from "@effect/core/io/Differ/ChunkPatch/definition"

/**
 * Combines two chunk patches to produce a new chunk patch that describes
 * applying their changes sequentially.
 *
 * @tsplus static effect/core/io/Differ.ChunkPatch.Aspects combine
 * @tsplus pipeable effect/core/io/Differ.ChunkPatch combine
 */
export function combine<Value, Patch>(that: ChunkPatch<Value, Patch>) {
  return (self: ChunkPatch<Value, Patch>): ChunkPatch<Value, Patch> =>
    new AndThenChunkPatch(self, that)
}
