// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk"
import type * as T from "../../../Effect"
import * as ContramapChunksEffect from "./contramapChunksEffect"
import type * as C from "./core"

/**
 * Effectfully transforms this sink's input elements.
 */
export function contramapEffect_<
  R,
  R1,
  InErr,
  InErr1 extends InErr,
  In,
  In1,
  OutErr,
  L,
  Z
>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  f: (in_: In1) => T.Effect<R1, InErr1, In>
): C.Sink<R1 & R, InErr & InErr1, In1, OutErr, L, Z> {
  return ContramapChunksEffect.contramapChunksEffect_(self, CK.mapEffect(f))
}

/**
 * Effectfully transforms this sink's input elements.
 *
 * @ets_data_first contramapEffect_
 */
export function contramapEffect<R1, InErr, InErr1 extends InErr, In, In1>(
  f: (in_: In1) => T.Effect<R1, InErr1, In>
) {
  return <R, OutErr, L, Z>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    contramapEffect_(self, f)
}
