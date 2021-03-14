// tracing: off

import { pipe } from "../../Function"
import { chain_, map } from "../core"
import type { Managed } from "../managed"
import { succeed } from "../succeed"
import { unit } from "./api"

/**
 * Loops with the specified effectual function, collecting the results into a
 * list. The moral equivalent of:
 *
 * ```
 * let s  = initial
 * let as = [] as readonly A[]
 *
 * while (cont(s)) {
 *   as = [body(s), ...as]
 *   s  = inc(s)
 * }
 *
 * A.reverse(as)
 * ```
 */
export function loop<Z>(initial: Z, cont: (z: Z) => boolean, inc: (z: Z) => Z) {
  return <R, E, A>(body: (z: Z) => Managed<R, E, A>): Managed<R, E, readonly A[]> => {
    if (cont(initial)) {
      return chain_(body(initial), (a) =>
        pipe(
          loop(inc(initial), cont, inc)(body),
          map((as) => [a, ...as])
        )
      )
    }
    return succeed([])
  }
}

/**
 * Loops with the specified effectual function purely for its effects. The
 * moral equivalent of:
 *
 * ```
 * var s = initial
 *
 * while (cont(s)) {
 *   body(s)
 *   s = inc(s)
 * }
 * ```
 */
export function loopUnit<Z>(initial: Z, cont: (z: Z) => boolean, inc: (z: Z) => Z) {
  return <R, E, X>(body: (z: Z) => Managed<R, E, X>): Managed<R, E, void> => {
    if (cont(initial)) {
      return chain_(body(initial), () => loopUnit(inc(initial), cont, inc)(body))
    }
    return unit
  }
}
