// ets_tracing: off

import * as T from "../../../Effect"
import * as CH from "../Channel"
import * as C from "./core.js"

/**
 * Creates a sink produced from an effect.
 */
export function unwrap<R, InErr, In, OutErr, L, Z>(
  managed: T.Effect<R, OutErr, C.Sink<R, InErr, In, OutErr, L, Z>>
): C.Sink<R, InErr, In, OutErr, L, Z> {
  return new C.Sink(CH.unwrap(T.map_(managed, (_) => _.channel)))
}
