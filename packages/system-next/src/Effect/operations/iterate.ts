import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { succeedNow } from "./succeedNow"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Iterates with the specified effectual function. The moral equivalent of:
 *
 * ```typescript
 * let s = initial
 *
 * while (cont(s)) {
 *   s = body(s)
 * }
 *
 * return s
 * ```
 */
export function iterate<Z>(initial: Z, cont: (z: Z) => boolean) {
  return <R, E>(body: (z: Z) => Effect<R, E, Z>, __trace?: string): Effect<R, E, Z> => {
    return suspendSucceed(() => {
      if (cont(initial)) {
        return chain_(body(initial), (z2) => iterate(z2, cont)(body))
      }
      return succeedNow(initial)
    }, __trace)
  }
}
