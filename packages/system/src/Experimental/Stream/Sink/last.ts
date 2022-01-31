// ets_tracing: off

import * as O from "../../../Option/index.js"
import type * as C from "./core.js"
import * as FoldLeft from "./foldLeft.js"

/**
 * Creates a sink containing the last value.
 */
export function last<Err, In>(): C.Sink<unknown, Err, In, Err, unknown, O.Option<In>> {
  return FoldLeft.foldLeft<Err, In, O.Option<In>>(O.none, (_, in_) => O.some(in_))
}
