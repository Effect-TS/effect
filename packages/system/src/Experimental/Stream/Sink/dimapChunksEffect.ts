// ets_tracing: off

import type * as CK from "../../../Collections/Immutable/Chunk/index.js"
import type * as T from "../../../Effect/index.js"
import * as ContramapChunksEffect from "./contramapChunksEffect.js"
import type * as C from "./core.js"
import * as MapEffect from "./mapEffect.js"

/**
 * Effectfully transforms both input chunks and result of this sink using the provided functions.
 * `f` and `g` must preserve chunking-invariance
 */
export function dimapChunksEffect_<
  R,
  R1,
  R2,
  InErr,
  InErr1 extends InErr,
  In,
  In1,
  OutErr,
  OutErr1,
  L,
  Z,
  Z1
>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  f: (in_: CK.Chunk<In1>) => T.Effect<R1, InErr1, CK.Chunk<In>>,
  g: (z: Z) => T.Effect<R2, OutErr1, Z1>
): C.Sink<R1 & R & R2, InErr & InErr1, In1, OutErr | OutErr1, L, Z1> {
  return MapEffect.mapEffect_(ContramapChunksEffect.contramapChunksEffect_(self, f), g)
}

/**
 * Effectfully transforms both input chunks and result of this sink using the provided functions.
 * `f` and `g` must preserve chunking-invariance
 *
 * @ets_data_first dimapChunksEffect_
 */
export function dimapChunksEffect<
  R1,
  R2,
  InErr,
  InErr1 extends InErr,
  In,
  In1,
  OutErr1,
  Z,
  Z1
>(
  f: (in_: CK.Chunk<In1>) => T.Effect<R1, InErr1, CK.Chunk<In>>,
  g: (z: Z) => T.Effect<R2, OutErr1, Z1>
) {
  return <R, OutErr, L>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    dimapChunksEffect_(self, f, g)
}
