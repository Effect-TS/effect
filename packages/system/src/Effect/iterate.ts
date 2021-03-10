// tracing: off

import { traceAs } from "@effect-ts/tracing-utils"

import { chain_, succeed, suspend } from "./core"
import type { Effect } from "./effect"

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
 *
 * @trace 1
 */
export function iterate<Z>(initial: Z, cont: (z: Z) => boolean) {
  return (
    /**
     * @trace 0
     */
    <R, E>(body: (z: Z) => Effect<R, E, Z>): Effect<R, E, Z> => {
      return suspend(
        traceAs(cont, () => {
          if (cont(initial)) {
            return chain_(suspend(traceAs(body, () => body(initial))), (z2) =>
              iterate(z2, cont)(body)
            )
          }
          return succeed(initial)
        })
      )
    }
  )
}
