// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import type * as T from "../../../Effect/index.js"
import * as ContramapChunksEffect from "./contramapChunksEffect.js"
import type * as C from "./core.js"

export function filterInputEffect_<
  R,
  R1,
  InErr,
  InErr1 extends InErr,
  In,
  In1 extends In,
  OutErr,
  L,
  Z
>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  p: (in_: In1) => T.Effect<R1, InErr1, boolean>
): C.Sink<R1 & R, InErr & InErr1, In1, OutErr, L, Z> {
  return ContramapChunksEffect.contramapChunksEffect_(self, CK.filterEffect(p))
}

/**
 * @ets_data_first filterInputEffect_
 */
export function filterInputEffect<R1, InErr, InErr1 extends InErr, In, In1 extends In>(
  p: (in_: In1) => T.Effect<R1, InErr1, boolean>
) {
  return <R, OutErr, L, Z>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    filterInputEffect_(self, p)
}
