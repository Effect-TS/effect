// ets_tracing: off

import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { suspend } from "./suspend"
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
    body: (z: Z) => Managed<R, E, X>,
    __trace?: string
  ): Managed<R, E, void> =>
    suspend(() => {
      if (cont(initial)) {
        return chain_(body(initial), () => loopUnit(inc(initial), cont, inc)(body))
      }
      return unit
    }, __trace)
}
