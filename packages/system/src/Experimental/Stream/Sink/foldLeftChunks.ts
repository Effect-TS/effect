// ets_tracing: off

import type * as CK from "../../../Collections/Immutable/Chunk/index.js"
import type * as C from "./core.js"
import * as FoldChunks from "./foldChunks.js"

/**
 * A sink that folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export function foldLeftChunks<Err, In, S>(
  z: S,
  f: (s: S, chunk: CK.Chunk<In>) => S
): C.Sink<unknown, Err, In, Err, unknown, S> {
  return FoldChunks.foldChunks<Err, In, S>(z, (_) => true, f)
}
