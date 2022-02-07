// ets_tracing: off

import type * as C from "./core.js"
import * as FoldLeft from "./foldLeft.js"

/**
 * A sink that counts the number of elements fed to it.
 */
export function count<Err>(): C.Sink<unknown, Err, unknown, Err, unknown, number> {
  return FoldLeft.foldLeft<Err, unknown, number>(0, (s, _) => s + 1)
}
