// ets_tracing: off

import type * as M from "../../../Managed/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

export function managed_<R, InErr, In, OutErr, A, L, Z>(
  resource: M.Managed<R, OutErr, A>,
  fn: (a: A) => C.Sink<R, InErr, In, OutErr, L, Z>
): C.Sink<R, InErr, In, OutErr, L, Z> {
  return new C.Sink(CH.managed_(resource, (_) => fn(_).channel))
}

/**
 *
 * @ets_data_first managed_
 */
export function managed<R, InErr, In, OutErr, A, L, Z>(
  fn: (a: A) => C.Sink<R, InErr, In, OutErr, L, Z>
) {
  return (resource: M.Managed<R, OutErr, A>) => managed_(resource, fn)
}
