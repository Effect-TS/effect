// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as C from "../core.js"
import * as MapChunks from "./mapChunks.js"

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 */
export function mapConcatChunk_<R, E, A, A1>(
  self: C.Stream<R, E, A>,
  f: (a: A) => CK.Chunk<A1>
): C.Stream<R, E, A1> {
  return MapChunks.mapChunks_(self, CK.chain(f))
}

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 *
 * @ets_data_first mapConcatChunk_
 */
export function mapConcatChunk<A, A1>(f: (a: A) => CK.Chunk<A1>) {
  return <R, E>(self: C.Stream<R, E, A>) => mapConcatChunk_(self, f)
}
