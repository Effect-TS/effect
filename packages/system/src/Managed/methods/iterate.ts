// ets_tracing: off

import { chain_ } from "../core.js"
import type { Managed } from "../managed.js"
import { succeed } from "../succeed.js"
import { suspend } from "./suspend.js"

/**
 * Iterates with the specified effectual function. The moral equivalent of:
 *
 * ```
 * let s = initial
 *
 * while (cont(s)) {
 *   s = body(s)
 * }
 *
 * return s
 * ```
 */
export function iterate<Z>(initial: Z) {
  return (cont: (z: Z) => boolean) =>
    <R, E>(body: (z: Z) => Managed<R, E, Z>, __trace?: string): Managed<R, E, Z> =>
      suspend(() => {
        if (cont(initial)) {
          return chain_(body(initial), (z2) => iterate(z2)(cont)(body))
        }
        return succeed(initial)
      }, __trace)
}
