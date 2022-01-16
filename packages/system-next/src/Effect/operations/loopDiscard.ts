// ets_tracing: off

import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { suspendSucceed } from "./suspendSucceed"
import { unit } from "./unit"

/**
 * Loops with the specified effectual function purely for its effects. The
 * moral equivalent of:
 *
 * ```typescript
 * var s = initial
 *
 * while (cont(s)) {
 *   body(s)
 *   s = inc(s)
 * }
 * ```
 */
export function loopUnit<Z>(initial: Z, cont: (z: Z) => boolean, inc: (z: Z) => Z) {
  return <R, E, X>(
    body: (z: Z) => Effect<R, E, X>,
    __trace?: string
  ): Effect<R, E, void> => {
    return suspendSucceed(() => {
      if (cont(initial)) {
        return chain_(body(initial), () => loopUnit(inc(initial), cont, inc)(body))
      }
      return unit
    }, __trace)
  }
}
