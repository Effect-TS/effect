import { pipe } from "../Function"
import { chain_, succeed, unit } from "./core"
import type { Effect } from "./effect"
import { map } from "./map"

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
export function loop<Z>(initial: Z) {
  return (cont: (z: Z) => boolean, inc: (z: Z) => Z) => <S, R, E, A>(
    body: (z: Z) => Effect<S, R, E, A>
  ): Effect<S, R, E, readonly A[]> => {
    if (cont(initial)) {
      return chain_(body(initial), (a) =>
        pipe(
          loop(inc(initial))(cont, inc)(body),
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
export function loopUnit<Z>(initial: Z) {
  return (cont: (z: Z) => boolean, inc: (z: Z) => Z) => <S, R, E>(
    body: (z: Z) => Effect<S, R, E, any>
  ): Effect<S, R, E, void> => {
    if (cont(initial)) {
      return chain_(body(initial), () => loop(inc(initial))(cont, inc)(body))
    }
    return unit
  }
}
