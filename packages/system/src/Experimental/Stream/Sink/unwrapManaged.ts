// ets_tracing: off

import * as M from "../../../Managed/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * Creates a sink produced from a managed effect.
 */
export function unwrapManaged<R, InErr, In, OutErr, L, Z>(
  managed: M.Managed<R, OutErr, C.Sink<R, InErr, In, OutErr, L, Z>>
): C.Sink<R, InErr, In, OutErr, L, Z> {
  return new C.Sink(CH.unwrapManaged(M.map_(managed, (_) => _.channel)))
}
