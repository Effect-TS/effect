// ets_tracing: off

import * as T from "../../../Effect/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

export function accessSink<R, R1, InErr, In, OutErr, L, Z>(
  f: (r: R) => C.Sink<R1, InErr, In, OutErr, L, Z>
): C.Sink<R & R1, InErr, In, OutErr, L, Z> {
  return new C.Sink(CH.unwrap(T.access((_: R) => f(_).channel)))
}
