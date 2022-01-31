// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import type { Predicate, Refinement } from "../../../Function/index.js"
import * as ContramapChunks from "./contramapChunks.js"
import type * as C from "./core.js"

export function filterInput_<
  R,
  InErr,
  In,
  In1 extends In,
  In2 extends In1,
  OutErr,
  L,
  Z
>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  p: Refinement<In1, In2>
): C.Sink<R, InErr, In2, OutErr, L, Z>
export function filterInput_<R, InErr, In, In1 extends In, OutErr, L, Z>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  p: Predicate<In1>
): C.Sink<R, InErr, In1, OutErr, L, Z>
export function filterInput_<R, InErr, In, In1 extends In, OutErr, L, Z>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  p: Predicate<In1>
): C.Sink<R, InErr, In1, OutErr, L, Z> {
  return ContramapChunks.contramapChunks_(self, CK.filter(p))
}

/**
 * @ets_data_first filterInput_
 */
export function filterInput<In, In1 extends In, In2 extends In1>(
  p: Refinement<In1, In2>
): <R, InErr, OutErr, L, Z>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>
) => C.Sink<R, InErr, In2, OutErr, L, Z>
export function filterInput<In, In1 extends In>(
  p: Predicate<In1>
): <R, InErr, OutErr, L, Z>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>
) => C.Sink<R, InErr, In1, OutErr, L, Z>
export function filterInput<In, In1 extends In>(
  p: Predicate<In1>
): <R, InErr, OutErr, L, Z>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>
) => C.Sink<R, InErr, In1, OutErr, L, Z> {
  return <R, InErr, OutErr, L, Z>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    filterInput_(self, p)
}
