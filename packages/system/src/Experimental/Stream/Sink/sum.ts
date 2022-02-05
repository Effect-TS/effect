// ets_tracing: off

import type * as C from "./core.js"
import * as FoldLeft from "./foldLeft.js"

/**
 * A sink that sums incoming numeric values.
 */
export function sum<Err>(): C.Sink<unknown, Err, number, Err, unknown, number> {
  return FoldLeft.foldLeft<Err, number, number>(0, (a, b) => a + b)
}
