// ets_tracing: off

import type * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as ContramapChunks from "./contramapChunks.js"
import type * as C from "./core.js"
import * as Map from "./map.js"

/**
 * Transforms both input chunks and result of this sink using the provided functions.
 */
export function dimapChunks_<R, InErr, In, In1, OutErr, L, Z, Z1>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  f: (in_: CK.Chunk<In1>) => CK.Chunk<In>,
  g: (z: Z) => Z1
): C.Sink<R, InErr, In1, OutErr, L, Z1> {
  return Map.map_(ContramapChunks.contramapChunks_(self, f), g)
}

/**
 * Transforms both input chunks and result of this sink using the provided functions.
 *
 * @ets_data_first dimapChunks_
 */
export function dimapChunks<In, In1, Z, Z1>(
  f: (in_: CK.Chunk<In1>) => CK.Chunk<In>,
  g: (z: Z) => Z1
) {
  return <R, InErr, OutErr, L>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    dimapChunks_(self, f, g)
}
