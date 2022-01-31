// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import type { Stream } from "./definitions.js"
import { mapChunks_ } from "./mapChunks.js"

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 */
export function mapConcatChunk_<R, E, O, O2>(
  self: Stream<R, E, O>,
  f: (_: O) => A.Chunk<O2>
): Stream<R, E, O2> {
  return mapChunks_(self, (o) => A.chain_(o, f))
}

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 */
export function mapConcatChunk<O, O2>(f: (_: O) => A.Chunk<O2>) {
  return <R, E>(self: Stream<R, E, O>) => mapConcatChunk_(self, f)
}
