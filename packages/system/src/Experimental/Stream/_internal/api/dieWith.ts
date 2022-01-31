// ets_tracing: off

import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Halt a stream with the specified exception
 */
export function dieWith(u: () => unknown): C.UIO<never> {
  return new C.Stream(CH.dieWith(u))
}
