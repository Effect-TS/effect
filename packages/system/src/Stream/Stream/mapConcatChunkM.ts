// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk/index.js"
import { identity, pipe } from "../../Function/index.js"
import type * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { mapConcatChunk } from "./mapConcatChunk.js"
import { mapM } from "./mapM.js"

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 */
export function mapConcatChunkM_<R, R2, E, E2, O, O2>(
  self: Stream<R, E, O>,
  f: (_: O) => T.Effect<R2, E2, A.Chunk<O2>>
): Stream<R & R2, E | E2, O2> {
  return pipe(self, mapM(f), mapConcatChunk(identity))
}

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 */
export function mapConcatChunkM<R2, E2, O, O2>(
  f: (_: O) => T.Effect<R2, E2, A.Chunk<O2>>
) {
  return <R, E>(self: Stream<R, E, O>) => mapConcatChunkM_(self, f)
}
