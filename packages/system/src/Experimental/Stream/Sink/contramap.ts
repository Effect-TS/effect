// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as ContramapChunks from "./contramapChunks.js"
import type * as C from "./core.js"

/**
 * Transforms this sink's input elements.
 */
export function contramap_<R, InErr, In, In1, OutErr, L, Z>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  f: (in_: In1) => In
): C.Sink<R, InErr, In1, OutErr, L, Z> {
  return ContramapChunks.contramapChunks_(self, CK.map(f))
}

/**
 * Transforms this sink's input elements.
 *
 * @ets_data_first contramap_
 */
export function contramap<In, In1>(f: (in_: In1) => In) {
  return <R, InErr, OutErr, L, Z>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    contramap_(self, f)
}
