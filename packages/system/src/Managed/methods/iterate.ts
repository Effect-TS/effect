// tracing: off

import { chain_ } from "../core"
import type { Managed } from "../managed"
import { succeed } from "../succeed"
import { suspend } from "./suspend"

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
