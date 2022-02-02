// ets_tracing: off

import { chain_, succeed, suspend } from "./core.js"
import type { Effect } from "./effect.js"

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
export function iterate<Z>(initial: Z, cont: (z: Z) => boolean) {
  return <R, E>(body: (z: Z) => Effect<R, E, Z>, __trace?: string): Effect<R, E, Z> => {
    return suspend(() => {
      if (cont(initial)) {
        return chain_(body(initial), (z2) => iterate(z2, cont)(body))
      }
      return succeed(initial)
    }, __trace)
  }
}
